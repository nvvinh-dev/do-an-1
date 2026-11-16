using Microsoft.EntityFrameworkCore;
using SmartRent.Api.Contracts;
using SmartRent.Domain;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Persistence;
using SmartRent.Infrastructure.Storage;

namespace SmartRent.Api.Services;

/// <summary>
/// Báo sự cố và xem sự cố — BP-08, FR-136 đến FR-139, api-design mục 18. Người thuê truy sự cố qua hợp đồng mình
/// đứng tên, Chủ trọ qua hợp đồng → phòng → khu trọ của mình (BR-04); sự cố không thuộc người gọi trả 404.
/// </summary>
public class MaintenanceRequestService
{
    private static readonly TimeSpan PrivateFileUrlLifetime = TimeSpan.FromHours(1);

    private readonly AppDbContext _db;
    private readonly Notifier _notifier;
    private readonly IFileStorage _fileStorage;

    public MaintenanceRequestService(AppDbContext db, Notifier notifier, IFileStorage fileStorage)
    {
        _db = db;
        _notifier = notifier;
        _fileStorage = fileStorage;
    }

    /// <summary>FR-136, FR-137: tạo sự cố Mới và thông báo cho Chủ trọ (SuCoMoi, mức Cao).</summary>
    public async Task<ServiceResult<MaintenanceRequestDetailResponse>> ReportAsync(
        long tenantUserId,
        ReportMaintenanceRequestRequest request,
        CancellationToken cancellationToken = default)
    {
        var contract = await _db.Contracts
            .AsNoTracking()
            .Where(c => c.Id == request.ContractId && c.TenantUserId == tenantUserId)
            .Select(c => new
            {
                Contract = c,
                RoomCode = c.Room.Code,
                PropertyName = c.Room.Property.Name,
                c.Room.Property.LandlordUserId
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (contract is null)
        {
            return ServiceResult<MaintenanceRequestDetailResponse>.Fail(
                StatusCodes.Status404NotFound, "Không tìm thấy hợp đồng.");
        }

        var now = DateTimeOffset.UtcNow;

        if (!contract.Contract.CanReportMaintenance(VietnamTime.DateOf(now)))
        {
            return ServiceResult<MaintenanceRequestDetailResponse>.Fail(
                StatusCodes.Status409Conflict,
                "Chỉ báo được sự cố khi bạn đang ở phòng này: hợp đồng đã tới ngày bắt đầu và chưa qua ngày trả phòng.");
        }

        var imagePaths = request.ImagePaths ?? [];
        var imageError = await CheckImagePathsAsync(imagePaths, tenantUserId, cancellationToken);

        if (imageError is not null)
        {
            return ServiceResult<MaintenanceRequestDetailResponse>.Fail(
                StatusCodes.Status422UnprocessableEntity, imageError);
        }

        var maintenanceRequest = MaintenanceRequest.Report(
            contract.Contract.Id,
            request.Title.Trim(),
            request.Description.Trim(),
            request.Urgency!.Value,
            imagePaths,
            now);

        // Lưu sự cố trước để có id gắn vào thông báo; hai lần lưu nằm trong cùng transaction.
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        _db.MaintenanceRequests.Add(maintenanceRequest);
        await _db.SaveChangesAsync(cancellationToken);

        _notifier.Notify(
            contract.LandlordUserId,
            "SuCoMoi",
            "Có sự cố mới",
            $"Người thuê phòng {contract.RoomCode} ({contract.PropertyName}) báo sự cố " +
            $"mức {UrgencyLabel(maintenanceRequest.Urgency)}: {maintenanceRequest.Title}.",
            nameof(MaintenanceRequest),
            maintenanceRequest.Id);

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await GetDetailAsync(tenantUserId, maintenanceRequest.Id, cancellationToken);
    }

    /// <summary>FR-139: Người thuê thấy sự cố của hợp đồng mình đứng tên; Chủ trọ thấy sự cố trên khu trọ của mình.</summary>
    /// <param name="sortByUrgency">Khẩn cấp trước, cùng mức thì mới hơn trước; ngược lại mới nhất trước.</param>
    public async Task<PagedResponse<MaintenanceRequestListItemResponse>> ListAsync(
        long userId,
        bool asLandlord,
        MaintenanceRequestStatus? status,
        long? contractId,
        long? propertyId,
        MaintenanceUrgency? urgency,
        bool sortByUrgency,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _db.MaintenanceRequests.AsNoTracking();

        query = asLandlord
            ? query.Where(m => m.Contract.Room.Property.LandlordUserId == userId)
            : query.Where(m => m.Contract.TenantUserId == userId);

        if (status is not null)
        {
            query = query.Where(m => m.Status == status);
        }

        if (contractId is not null)
        {
            query = query.Where(m => m.ContractId == contractId);
        }

        // Lọc theo khu trọ chỉ dành cho Chủ trọ.
        if (asLandlord && propertyId is not null)
        {
            query = query.Where(m => m.Contract.Room.PropertyId == propertyId);
        }

        if (urgency is not null)
        {
            query = query.Where(m => m.Urgency == urgency);
        }

        var total = await query.CountAsync(cancellationToken);

        // Cột urgency lưu dạng chữ, sắp theo chữ không ra thứ tự mức nên đổi sang số ngay trong câu truy vấn.
        var ordered = sortByUrgency
            ? query
                .OrderBy(m => m.Urgency == MaintenanceUrgency.KhanCap ? 0 : m.Urgency == MaintenanceUrgency.Gap ? 1 : 2)
                .ThenByDescending(m => m.CreatedAt)
            : query.OrderByDescending(m => m.CreatedAt);

        var items = await ordered
            .ThenByDescending(m => m.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new MaintenanceRequestListItemResponse(
                m.Id,
                m.ContractId,
                m.Contract.Room.Code,
                m.Contract.Room.Property.Name,
                m.Title,
                m.Urgency,
                m.Status,
                m.CreatedAt,
                m.ExpectedCompletionDate))
            .ToListAsync(cancellationToken);

        return new PagedResponse<MaintenanceRequestListItemResponse>(
            items, page, pageSize, total, (int)Math.Ceiling(total / (double)pageSize));
    }

    /// <summary>FR-139: chỉ Người thuê đứng tên hợp đồng và Chủ trọ sở hữu khu trọ xem được; người khác nhận 404.</summary>
    public async Task<ServiceResult<MaintenanceRequestDetailResponse>> GetDetailAsync(
        long userId,
        long id,
        CancellationToken cancellationToken = default)
    {
        var row = await _db.MaintenanceRequests
            .AsNoTracking()
            .Where(m => m.Id == id)
            .Select(m => new
            {
                Request = m,
                Images = m.Images.OrderBy(i => i.DisplayOrder).Select(i => i.Url).ToList(),
                RoomCode = m.Contract.Room.Code,
                PropertyName = m.Contract.Room.Property.Name,
                m.Contract.TenantUserId,
                m.Contract.Room.Property.LandlordUserId
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (row is null || (row.TenantUserId != userId && row.LandlordUserId != userId))
        {
            return ServiceResult<MaintenanceRequestDetailResponse>.Fail(
                StatusCodes.Status404NotFound, "Không tìm thấy sự cố.");
        }

        var tenantFullName = await _db.Users
            .Where(u => u.Id == row.TenantUserId)
            .Select(u => u.FullName)
            .FirstAsync(cancellationToken);

        // Ảnh sự cố nằm ở bucket riêng tư: URL có chữ ký sinh sau khi đã kiểm quyền xem.
        var imageUrls = await Task.WhenAll(row.Images.Select(path =>
            _fileStorage.CreateSignedUrlAsync(path, PrivateFileUrlLifetime, cancellationToken)));

        var m = row.Request;

        return ServiceResult<MaintenanceRequestDetailResponse>.Ok(new MaintenanceRequestDetailResponse(
            m.Id,
            m.ContractId,
            row.RoomCode,
            row.PropertyName,
            tenantFullName,
            m.Title,
            m.Description,
            m.Urgency,
            m.Status,
            m.CreatedAt,
            m.AcceptedAt,
            m.ExpectedCompletionDate,
            m.CompletedAt,
            m.NotFixedReason,
            m.RejectionReason,
            m.EstimatedCompensation,
            m.RejectedAt,
            m.ClosedAt,
            m.IsAutoClosed,
            m.CancelledAt,
            imageUrls.Select(url => new MaintenanceRequestImageResponse(url)).ToList()));
    }

    /// <summary>
    /// FR-138, api-design mục 14: ảnh không trùng nhau, mỗi đường dẫn là file AnhSuCo đúng định dạng server sinh ra,
    /// nằm trong thư mục của chính Người thuê và còn trên Storage. Số ảnh tối đa đã kiểm ở validator. Trả null khi hợp lệ.
    /// </summary>
    private async Task<string?> CheckImagePathsAsync(
        IReadOnlyList<string> paths,
        long tenantUserId,
        CancellationToken cancellationToken)
    {
        if (paths.Distinct(StringComparer.Ordinal).Count() != paths.Count)
        {
            return "Danh sách ảnh có ảnh bị trùng.";
        }

        var owned = await Task.WhenAll(
            paths.Select(path => _fileStorage.IsOwnedByAsync(path, FilePurpose.AnhSuCo, tenantUserId, cancellationToken)));

        return owned.All(isOwned => isOwned)
            ? null
            : "Đường dẫn ảnh không hợp lệ: chỉ nhận ảnh sự cố do chính bạn tải lên.";
    }

    private static string UrgencyLabel(MaintenanceUrgency urgency) => urgency switch
    {
        MaintenanceUrgency.KhanCap => "khẩn cấp",
        MaintenanceUrgency.Gap => "gấp",
        _ => "bình thường"
    };
}
