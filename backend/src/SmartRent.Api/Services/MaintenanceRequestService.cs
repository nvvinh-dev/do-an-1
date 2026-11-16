using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SmartRent.Api.Contracts;
using SmartRent.Domain;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Persistence;
using SmartRent.Infrastructure.Storage;

namespace SmartRent.Api.Services;

/// <summary>
/// Sự cố — BP-08, FR-136 đến FR-147, api-design mục 18: báo, xem, vòng đời và hai tác vụ định kỳ. Người thuê truy
/// sự cố qua hợp đồng mình đứng tên, Chủ trọ qua hợp đồng → phòng → khu trọ của mình (BR-04); sự cố không thuộc
/// người gọi trả 404. Đổi trạng thái sự cố không ghi audit_logs (không thuộc BR-23).
/// </summary>
public class MaintenanceRequestService
{
    private static readonly TimeSpan PrivateFileUrlLifetime = TimeSpan.FromHours(1);

    private static readonly CultureInfo VietnameseCulture = CultureInfo.GetCultureInfo("vi-VN");

    private const string OverdueAcceptanceEvent = "SuCoQuaHanTiepNhan";

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

    /// <summary>FR-140: Chủ trọ tiếp nhận sự cố Mới, kể cả khi đã quá 72 giờ; Người thuê nhận thông báo.</summary>
    public async Task<ServiceResult> AcceptAsync(
        long landlordUserId,
        long id,
        DateOnly? expectedCompletionDate,
        CancellationToken cancellationToken = default)
    {
        var request = await FindForLandlordAsync(landlordUserId, id, cancellationToken);

        if (request is null)
        {
            return NotFound();
        }

        if (!request.CanAccept)
        {
            return Conflict("Chỉ tiếp nhận được sự cố đang ở trạng thái Mới.");
        }

        request.Accept(expectedCompletionDate, DateTimeOffset.UtcNow);

        var expected = expectedCompletionDate is { } date ? $" Ngày dự kiến sửa xong: {date:dd/MM/yyyy}." : string.Empty;

        NotifyStatusChanged(
            request,
            request.Contract.TenantUserId,
            "Sự cố đã được tiếp nhận",
            $"Chủ trọ đã tiếp nhận sự cố \"{request.Title}\" ở phòng {RoomLabel(request)}.{expected}");

        return await SaveAsync(cancellationToken);
    }

    /// <summary>FR-140: sửa ngày dự kiến khi sự cố Đang xử lý; không gửi thông báo.</summary>
    public async Task<ServiceResult> ChangeExpectedCompletionDateAsync(
        long landlordUserId,
        long id,
        DateOnly? expectedCompletionDate,
        CancellationToken cancellationToken = default)
    {
        var request = await FindForLandlordAsync(landlordUserId, id, cancellationToken);

        if (request is null)
        {
            return NotFound();
        }

        if (!request.CanChangeExpectedCompletionDate)
        {
            return Conflict("Chỉ sửa được ngày dự kiến khi sự cố đang xử lý.");
        }

        request.ChangeExpectedCompletionDate(expectedCompletionDate);

        return await SaveAsync(cancellationToken);
    }

    /// <summary>FR-141: Chủ trọ từ chối sự cố Mới hoặc Đang xử lý; Người thuê nhận thông báo.</summary>
    public async Task<ServiceResult> RejectAsync(
        long landlordUserId,
        long id,
        RejectMaintenanceRequestRequest body,
        CancellationToken cancellationToken = default)
    {
        var request = await FindForLandlordAsync(landlordUserId, id, cancellationToken);

        if (request is null)
        {
            return NotFound();
        }

        if (!request.CanReject)
        {
            return Conflict("Chỉ từ chối được sự cố đang ở trạng thái Mới hoặc Đang xử lý.");
        }

        var reason = body.Reason.Trim();

        request.Reject(reason, body.EstimatedCompensation, DateTimeOffset.UtcNow);

        var compensation = body.EstimatedCompensation is { } amount
            ? $" Bồi thường dự kiến: {amount.ToString("N0", VietnameseCulture)} đồng."
            : string.Empty;

        NotifyStatusChanged(
            request,
            request.Contract.TenantUserId,
            "Sự cố bị từ chối",
            $"Chủ trọ đã từ chối sự cố \"{request.Title}\" ở phòng {RoomLabel(request)}. Lý do: {reason}{compensation}");

        return await SaveAsync(cancellationToken);
    }

    /// <summary>FR-142: Chủ trọ báo đã sửa xong; Người thuê nhận thông báo và có 7 ngày để xác nhận.</summary>
    public async Task<ServiceResult> CompleteAsync(long landlordUserId, long id, CancellationToken cancellationToken = default)
    {
        var request = await FindForLandlordAsync(landlordUserId, id, cancellationToken);

        if (request is null)
        {
            return NotFound();
        }

        if (!request.CanComplete)
        {
            return Conflict("Chỉ báo sửa xong được sự cố đang xử lý.");
        }

        request.Complete(DateTimeOffset.UtcNow);

        NotifyStatusChanged(
            request,
            request.Contract.TenantUserId,
            "Sự cố đã được sửa xong",
            $"Chủ trọ báo đã sửa xong sự cố \"{request.Title}\" ở phòng {RoomLabel(request)}. Hãy xác nhận đã khắc phục " +
            "hoặc báo chưa đạt trong 7 ngày, sau đó sự cố tự đóng.");

        return await SaveAsync(cancellationToken);
    }

    /// <summary>FR-143: Người thuê xác nhận đã khắc phục; Chủ trọ nhận thông báo.</summary>
    public async Task<ServiceResult> ConfirmAsync(long tenantUserId, long id, CancellationToken cancellationToken = default)
    {
        var request = await FindForTenantAsync(tenantUserId, id, cancellationToken);

        if (request is null)
        {
            return NotFound();
        }

        if (!request.CanConfirm)
        {
            return Conflict("Chỉ xác nhận được sự cố đang chờ bạn xác nhận.");
        }

        request.Confirm(DateTimeOffset.UtcNow);

        NotifyStatusChanged(
            request,
            request.Contract.Room.Property.LandlordUserId,
            "Sự cố đã đóng",
            $"Người thuê phòng {RoomLabel(request)} xác nhận sự cố \"{request.Title}\" đã được khắc phục.");

        return await SaveAsync(cancellationToken);
    }

    /// <summary>FR-143: Người thuê báo chưa đạt trong 168 giờ kể từ lần báo sửa xong gần nhất; Chủ trọ nhận thông báo.</summary>
    public async Task<ServiceResult> MarkNotFixedAsync(
        long tenantUserId,
        long id,
        string reason,
        CancellationToken cancellationToken = default)
    {
        var request = await FindForTenantAsync(tenantUserId, id, cancellationToken);

        if (request is null)
        {
            return NotFound();
        }

        var now = DateTimeOffset.UtcNow;

        if (!request.CanMarkNotFixed(now))
        {
            return Conflict(request.CanConfirm
                ? "Đã quá 7 ngày kể từ lần Chủ trọ báo sửa xong, không báo chưa đạt được nữa."
                : "Chỉ báo chưa đạt được sự cố đang chờ bạn xác nhận.");
        }

        var trimmed = reason.Trim();

        request.MarkNotFixed(trimmed, now);

        NotifyStatusChanged(
            request,
            request.Contract.Room.Property.LandlordUserId,
            "Sự cố chưa được khắc phục",
            $"Người thuê phòng {RoomLabel(request)} báo sự cố \"{request.Title}\" chưa đạt. Lý do: {trimmed}");

        return await SaveAsync(cancellationToken);
    }

    /// <summary>FR-145: Người thuê hủy sự cố Mới hoặc Đang xử lý; Chủ trọ nhận thông báo.</summary>
    public async Task<ServiceResult> CancelAsync(long tenantUserId, long id, CancellationToken cancellationToken = default)
    {
        var request = await FindForTenantAsync(tenantUserId, id, cancellationToken);

        if (request is null)
        {
            return NotFound();
        }

        if (!request.CanCancel)
        {
            return Conflict("Chỉ hủy được sự cố đang ở trạng thái Mới hoặc Đang xử lý.");
        }

        request.Cancel(DateTimeOffset.UtcNow);

        NotifyStatusChanged(
            request,
            request.Contract.Room.Property.LandlordUserId,
            "Sự cố đã bị hủy",
            $"Người thuê phòng {RoomLabel(request)} đã hủy sự cố \"{request.Title}\".");

        return await SaveAsync(cancellationToken);
    }

    /// <summary>
    /// Tác vụ định kỳ — FR-144: sự cố Chờ người thuê xác nhận quá 168 giờ kể từ lần báo sửa xong gần nhất chuyển
    /// Đã đóng, ghi là tự đóng; hai bên nhận thông báo. Sự cố đã được người dùng đổi trạng thái thì bỏ qua.
    /// </summary>
    public async Task<int> AutoCloseAsync(DateTimeOffset now, CancellationToken cancellationToken = default)
    {
        var completedBefore = now - MaintenanceRequest.ConfirmationWindow;

        var ids = await _db.MaintenanceRequests
            .Where(m => m.Status == MaintenanceRequestStatus.ChoNguoiThueXacNhan && m.CompletedAt < completedBefore)
            .Select(m => m.Id)
            .ToListAsync(cancellationToken);

        var closed = 0;

        foreach (var id in ids)
        {
            // Xử lý từng sự cố: một sự cố vừa bị người dùng thao tác cùng lúc không làm hỏng cả lượt chạy.
            _db.ChangeTracker.Clear();

            var request = await QueryWithRoom().FirstOrDefaultAsync(m => m.Id == id, cancellationToken);

            if (request is null || !request.ShouldAutoClose(now))
            {
                continue;
            }

            request.AutoClose(now);

            var content = $"Sự cố \"{request.Title}\" ở phòng {RoomLabel(request)} đã tự đóng vì quá 7 ngày kể từ lần " +
                          "Chủ trọ báo sửa xong mà Người thuê không xác nhận hay báo chưa đạt.";

            NotifyStatusChanged(request, request.Contract.TenantUserId, "Sự cố đã tự đóng", content);
            NotifyStatusChanged(request, request.Contract.Room.Property.LandlordUserId, "Sự cố đã tự đóng", content);

            if ((await SaveAsync(cancellationToken)).Succeeded)
            {
                closed++;
            }
        }

        return closed;
    }

    /// <summary>
    /// Tác vụ định kỳ — BP-08 A4, FR-147: sự cố ở Mới quá 72 giờ thì Người thuê nhận một thông báo gợi ý gửi khiếu
    /// nại; sự cố giữ nguyên trạng thái. Mỗi sự cố chỉ gửi một lần: bỏ qua sự cố đã có thông báo cùng loại.
    /// </summary>
    public async Task<int> RemindUnacceptedAsync(DateTimeOffset now, CancellationToken cancellationToken = default)
    {
        var createdBefore = now - MaintenanceRequest.AcceptanceWindow;

        var overdue = await _db.MaintenanceRequests
            .AsNoTracking()
            .Where(m => m.Status == MaintenanceRequestStatus.Moi
                        && m.CreatedAt < createdBefore
                        && !_db.Notifications.Any(n => n.EventType == OverdueAcceptanceEvent
                                                       && n.RelatedEntityType == nameof(MaintenanceRequest)
                                                       && n.RelatedEntityId == m.Id))
            .Select(m => new
            {
                m.Id,
                m.Title,
                m.Contract.TenantUserId,
                RoomCode = m.Contract.Room.Code,
                PropertyName = m.Contract.Room.Property.Name
            })
            .ToListAsync(cancellationToken);

        foreach (var m in overdue)
        {
            _notifier.Notify(
                m.TenantUserId,
                OverdueAcceptanceEvent,
                "Sự cố chưa được tiếp nhận",
                $"Sự cố \"{m.Title}\" ở phòng {m.RoomCode} ({m.PropertyName}) đã quá 72 giờ mà Chủ trọ chưa tiếp nhận. " +
                "Bạn có thể gửi khiếu nại tới quản trị viên.",
                nameof(MaintenanceRequest),
                m.Id);
        }

        if (overdue.Count > 0)
        {
            await _db.SaveChangesAsync(cancellationToken);
        }

        return overdue.Count;
    }

    /// <summary>Sự cố trên khu trọ của Chủ trọ, kèm hợp đồng → phòng → khu trọ; không thuộc người gọi trả null (404).</summary>
    private Task<MaintenanceRequest?> FindForLandlordAsync(long landlordUserId, long id, CancellationToken cancellationToken)
        => QueryWithRoom().FirstOrDefaultAsync(
            m => m.Id == id && m.Contract.Room.Property.LandlordUserId == landlordUserId, cancellationToken);

    /// <summary>Sự cố của hợp đồng Người thuê đứng tên; không thuộc người gọi trả null (404).</summary>
    private Task<MaintenanceRequest?> FindForTenantAsync(long tenantUserId, long id, CancellationToken cancellationToken)
        => QueryWithRoom().FirstOrDefaultAsync(
            m => m.Id == id && m.Contract.TenantUserId == tenantUserId, cancellationToken);

    private IQueryable<MaintenanceRequest> QueryWithRoom()
        => _db.MaintenanceRequests
            .Include(m => m.Contract)
            .ThenInclude(c => c.Room)
            .ThenInclude(r => r.Property);

    /// <summary>FR-147: đổi trạng thái gửi SuCoDoiTrangThai (mức Thường) cho bên còn lại, cùng transaction.</summary>
    private void NotifyStatusChanged(MaintenanceRequest request, long recipientUserId, string title, string content)
        => _notifier.Notify(
            recipientUserId, "SuCoDoiTrangThai", title, content, nameof(MaintenanceRequest), request.Id);

    private static string RoomLabel(MaintenanceRequest request)
        => $"{request.Contract.Room.Code} ({request.Contract.Room.Property.Name})";

    /// <summary>Hai bên thao tác cùng lúc trên một sự cố (xmin): bên lưu sau nhận 409.</summary>
    private async Task<ServiceResult> SaveAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
            return ServiceResult.Ok();
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict("Sự cố vừa được thay đổi bởi một thao tác khác. Hãy tải lại và thử lại.");
        }
    }

    private static ServiceResult NotFound()
        => ServiceResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy sự cố.");

    private static ServiceResult Conflict(string detail)
        => ServiceResult.Fail(StatusCodes.Status409Conflict, detail);

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
