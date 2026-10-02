using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SmartRent.Api.Contracts;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Identity;
using SmartRent.Infrastructure.Persistence;
using SmartRent.Infrastructure.Storage;

namespace SmartRent.Api.Services;

/// <summary>Nộp, duyệt và từ chối hồ sơ đăng ký Chủ trọ — BP-01, FR-06 đến FR-10.</summary>
public class LandlordApplicationService
{
    /// <summary>URL xem giấy tờ chỉ sống đủ lâu cho một lượt duyệt hồ sơ.</summary>
    private static readonly TimeSpan DocumentUrlLifetime = TimeSpan.FromMinutes(15);

    private readonly AppDbContext _db;
    private readonly UserManager<AppUser> _userManager;
    private readonly IFileStorage _fileStorage;
    private readonly AuditLogger _auditLogger;
    private readonly Notifier _notifier;

    public LandlordApplicationService(
        AppDbContext db,
        UserManager<AppUser> userManager,
        IFileStorage fileStorage,
        AuditLogger auditLogger,
        Notifier notifier)
    {
        _db = db;
        _userManager = userManager;
        _fileStorage = fileStorage;
        _auditLogger = auditLogger;
        _notifier = notifier;
    }

    /// <summary>FR-06, FR-07.</summary>
    public async Task<ServiceResult<LandlordApplicationResponse>> SubmitAsync(
        long userId,
        SubmitLandlordApplicationRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
        {
            return ServiceResult<LandlordApplicationResponse>.Fail(
                StatusCodes.Status404NotFound, "Không tìm thấy tài khoản.");
        }

        if (await _userManager.IsInRoleAsync(user, AppRoles.Landlord))
        {
            return ServiceResult<LandlordApplicationResponse>.Fail(
                StatusCodes.Status409Conflict, "Tài khoản đã là Chủ trọ.");
        }

        var hasPending = await _db.LandlordApplications.AnyAsync(
            a => a.UserId == userId && a.Status == LandlordApplicationStatus.ChoDuyet,
            cancellationToken);

        if (hasPending)
        {
            return ServiceResult<LandlordApplicationResponse>.Fail(
                StatusCodes.Status409Conflict, "Bạn đang có một hồ sơ chờ duyệt.");
        }

        // BR-01: số điện thoại do Admin xác minh khi duyệt, nên tài khoản phải có số trước khi nộp.
        if (string.IsNullOrWhiteSpace(user.PhoneNumber))
        {
            return ServiceResult<LandlordApplicationResponse>.Fail(
                StatusCodes.Status422UnprocessableEntity,
                "Tài khoản chưa có số điện thoại. Hãy cập nhật thông tin cá nhân trước khi nộp hồ sơ.");
        }

        // Đường dẫn file phải do hệ thống sinh ra ở bước tải lên, đúng loại giấy tờ,
        // do chính người nộp tải lên và thực sự tồn tại — không nhận đường dẫn tùy ý từ client.
        foreach (var path in new[] { request.IdCardFrontPath, request.IdCardBackPath, request.OwnershipDocumentPath })
        {
            if (!await _fileStorage.IsOwnedByAsync(path, FilePurpose.GiayToNhanThan, userId, cancellationToken))
            {
                return ServiceResult<LandlordApplicationResponse>.Fail(
                    StatusCodes.Status422UnprocessableEntity, "Giấy tờ không hợp lệ hoặc chưa được tải lên. Hãy tải giấy tờ lên lại.");
            }
        }

        var application = new LandlordApplication
        {
            UserId = userId,
            IdCardNumber = request.IdCardNumber,
            IdCardFrontUrl = request.IdCardFrontPath,
            IdCardBackUrl = request.IdCardBackPath,
            OwnershipDocumentUrl = request.OwnershipDocumentPath,
            Status = LandlordApplicationStatus.ChoDuyet,
            SubmittedAt = DateTimeOffset.UtcNow
        };

        _db.LandlordApplications.Add(application);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Hai lượt nộp gửi gần như cùng lúc đều qua được bước kiểm tra ở trên;
            // unique index chỉ cho một hồ sơ ChoDuyet mỗi người (FR-07) chặn lượt thứ hai.
            return ServiceResult<LandlordApplicationResponse>.Fail(
                StatusCodes.Status409Conflict, "Bạn đang có một hồ sơ chờ duyệt.");
        }

        return ServiceResult<LandlordApplicationResponse>.Ok(ToResponse(application));
    }

    public async Task<ServiceResult<LandlordApplicationResponse>> GetMineAsync(
        long userId,
        CancellationToken cancellationToken = default)
    {
        var application = await _db.LandlordApplications
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.SubmittedAt)
            .FirstOrDefaultAsync(cancellationToken);

        return application is null
            ? ServiceResult<LandlordApplicationResponse>.Fail(
                StatusCodes.Status404NotFound, "Bạn chưa nộp hồ sơ nào.")
            : ServiceResult<LandlordApplicationResponse>.Ok(ToResponse(application));
    }

    public async Task<PagedResponse<LandlordApplicationListItemResponse>> ListAsync(
        LandlordApplicationStatus? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _db.LandlordApplications.AsNoTracking();

        if (status is not null)
        {
            query = query.Where(a => a.Status == status);
        }

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(a => a.SubmittedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(_db.Users.AsNoTracking(),
                  a => a.UserId,
                  u => u.Id,
                  (a, u) => new LandlordApplicationListItemResponse(
                      a.Id, a.UserId, u.FullName, u.Email!, a.Status, a.SubmittedAt))
            .ToListAsync(cancellationToken);

        return new PagedResponse<LandlordApplicationListItemResponse>(
            items, page, pageSize, total, (int)Math.Ceiling(total / (double)pageSize));
    }

    /// <summary>
    /// FR-10: đây là nơi duy nhất trả về số CCCD và giấy tờ, và chỉ dành cho Admin.
    /// Ảnh được cấp URL có chữ ký, hết hạn sau 15 phút.
    /// </summary>
    public async Task<ServiceResult<LandlordApplicationDetailResponse>> GetDetailAsync(
        long id,
        CancellationToken cancellationToken = default)
    {
        var record = await _db.LandlordApplications
            .AsNoTracking()
            .Where(a => a.Id == id)
            .Join(_db.Users.AsNoTracking(),
                  a => a.UserId,
                  u => u.Id,
                  (a, u) => new { Application = a, User = u })
            .FirstOrDefaultAsync(cancellationToken);

        if (record is null)
        {
            return ServiceResult<LandlordApplicationDetailResponse>.Fail(
                StatusCodes.Status404NotFound, "Không tìm thấy hồ sơ.");
        }

        var a = record.Application;

        var documentUrls = await Task.WhenAll(
            _fileStorage.CreateSignedUrlAsync(a.IdCardFrontUrl, DocumentUrlLifetime, cancellationToken),
            _fileStorage.CreateSignedUrlAsync(a.IdCardBackUrl, DocumentUrlLifetime, cancellationToken),
            _fileStorage.CreateSignedUrlAsync(a.OwnershipDocumentUrl, DocumentUrlLifetime, cancellationToken));

        return ServiceResult<LandlordApplicationDetailResponse>.Ok(new LandlordApplicationDetailResponse(
            a.Id,
            a.UserId,
            record.User.FullName,
            record.User.Email!,
            record.User.PhoneNumber,
            a.IdCardNumber,
            documentUrls[0],
            documentUrls[1],
            documentUrls[2],
            a.Status,
            a.SubmittedAt,
            a.ReviewedAt,
            a.RejectReason));
    }

    /// <summary>
    /// FR-08: duyệt hồ sơ, cấp vai trò Chủ trọ thay cho vai trò Người thuê,
    /// và ghi nhận số điện thoại đã được Admin xác minh (BR-01).
    /// </summary>
    /// <param name="verifiedPhoneNumber">Số Admin đã gọi xác minh; phải trùng số hiện tại của người nộp.</param>
    public async Task<ServiceResult> ApproveAsync(
        long adminUserId,
        long applicationId,
        string verifiedPhoneNumber,
        CancellationToken cancellationToken = default)
    {
        var application = await _db.LandlordApplications
            .FirstOrDefaultAsync(a => a.Id == applicationId, cancellationToken);

        if (application is null)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy hồ sơ.");
        }

        if (application.Status != LandlordApplicationStatus.ChoDuyet)
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, "Hồ sơ này không còn chờ duyệt.");
        }

        var applicant = await _userManager.FindByIdAsync(application.UserId.ToString());

        if (applicant is null)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy người nộp hồ sơ.");
        }

        // Hồ sơ cũ còn sót ở ChoDuyet của người đã là Chủ trọ: không duyệt lại, Admin từ chối hồ sơ này.
        if (await _userManager.IsInRoleAsync(applicant, AppRoles.Landlord))
        {
            return ServiceResult.Fail(
                StatusCodes.Status409Conflict, "Người nộp hồ sơ đã là Chủ trọ. Hãy từ chối hồ sơ này.");
        }

        if (string.IsNullOrWhiteSpace(applicant.PhoneNumber))
        {
            return ServiceResult.Fail(
                StatusCodes.Status409Conflict, "Người nộp hồ sơ chưa có số điện thoại để xác minh.");
        }

        // Chỉ xác thực đúng số Admin đã gọi: người nộp đổi số trong lúc Admin xác minh thì không duyệt.
        if (applicant.PhoneNumber.Trim() != verifiedPhoneNumber.Trim())
        {
            return ServiceResult.Fail(
                StatusCodes.Status409Conflict,
                "Số điện thoại của người nộp đã thay đổi. Hãy gọi xác minh lại số hiện tại trước khi duyệt.");
        }

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        var previous = application.Status;
        application.Status = LandlordApplicationStatus.DaDuyet;
        application.ReviewedByUserId = adminUserId;
        application.ReviewedAt = DateTimeOffset.UtcNow;

        // Admin đã gọi xác minh đúng số này trong lúc duyệt hồ sơ.
        applicant.PhoneNumberConfirmed = true;

        _auditLogger.Write(
            adminUserId,
            "DuyetHoSoChuTro",
            nameof(LandlordApplication),
            application.Id,
            new { Status = previous.ToString(), Role = AppRoles.Tenant },
            new
            {
                Status = application.Status.ToString(),
                Role = AppRoles.Landlord,
                VerifiedPhoneNumber = applicant.PhoneNumber,
                PhoneNumberConfirmed = true
            });

        _notifier.Notify(
            application.UserId,
            "HoSoChuTroDuocDuyet",
            "Hồ sơ Chủ trọ đã được duyệt",
            "Bạn đã được cấp quyền Chủ trọ. Hãy đăng nhập lại để bắt đầu quản lý khu trọ và đăng tin cho thuê.",
            nameof(LandlordApplication),
            application.Id);

        await _db.SaveChangesAsync(cancellationToken);

        // Mỗi tài khoản có đúng một vai trò: Chủ trọ thay cho Người thuê.
        var roleResult = await _userManager.AddToRoleAsync(applicant, AppRoles.Landlord);

        if (roleResult.Succeeded)
        {
            roleResult = await _userManager.RemoveFromRoleAsync(applicant, AppRoles.Tenant);
        }

        if (!roleResult.Succeeded)
        {
            await transaction.RollbackAsync(cancellationToken);

            return ServiceResult.Fail(
                StatusCodes.Status500InternalServerError,
                "Không cấp được vai trò Chủ trọ: " +
                string.Join(" ", roleResult.Errors.Select(e => e.Description)));
        }

        await transaction.CommitAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    /// <summary>FR-08: từ chối hồ sơ, bắt buộc có lý do.</summary>
    public async Task<ServiceResult> RejectAsync(
        long adminUserId,
        long applicationId,
        string reason,
        CancellationToken cancellationToken = default)
    {
        var application = await _db.LandlordApplications
            .FirstOrDefaultAsync(a => a.Id == applicationId, cancellationToken);

        if (application is null)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy hồ sơ.");
        }

        if (application.Status != LandlordApplicationStatus.ChoDuyet)
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, "Hồ sơ này không còn chờ duyệt.");
        }

        var previous = application.Status;
        application.Status = LandlordApplicationStatus.TuChoi;
        application.RejectReason = reason;
        application.ReviewedByUserId = adminUserId;
        application.ReviewedAt = DateTimeOffset.UtcNow;

        _auditLogger.Write(
            adminUserId,
            "TuChoiHoSoChuTro",
            nameof(LandlordApplication),
            application.Id,
            new { Status = previous.ToString() },
            new { Status = application.Status.ToString(), Reason = reason });

        _notifier.Notify(
            application.UserId,
            "HoSoChuTroBiTuChoi",
            "Hồ sơ Chủ trọ bị từ chối",
            $"Lý do: {reason}. Bạn có thể bổ sung và nộp lại hồ sơ mới.",
            nameof(LandlordApplication),
            application.Id);

        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    private static LandlordApplicationResponse ToResponse(LandlordApplication a)
        => new(a.Id, a.Status, a.SubmittedAt, a.ReviewedAt, a.RejectReason);
}
