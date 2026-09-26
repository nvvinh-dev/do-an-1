using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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
                StatusCodes.Status404NotFound, "Khong tim thay tai khoan.");
        }

        if (await _userManager.IsInRoleAsync(user, AppRoles.Landlord))
        {
            return ServiceResult<LandlordApplicationResponse>.Fail(
                StatusCodes.Status409Conflict, "Tai khoan da la Chu tro.");
        }

        var hasPending = await _db.LandlordApplications.AnyAsync(
            a => a.UserId == userId && a.Status == LandlordApplicationStatus.ChoDuyet,
            cancellationToken);

        if (hasPending)
        {
            return ServiceResult<LandlordApplicationResponse>.Fail(
                StatusCodes.Status409Conflict, "Ban dang co mot ho so cho duyet.");
        }

        // Đường dẫn file phải do chính hệ thống sinh ra ở bước tải lên,
        // không nhận đường dẫn tùy ý từ client.
        foreach (var path in new[] { request.IdCardFrontPath, request.IdCardBackPath, request.OwnershipDocumentPath })
        {
            if (!path.StartsWith("private-documents/", StringComparison.Ordinal))
            {
                return ServiceResult<LandlordApplicationResponse>.Fail(
                    StatusCodes.Status422UnprocessableEntity, "Duong dan giay to khong hop le.");
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
        await _db.SaveChangesAsync(cancellationToken);

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
                StatusCodes.Status404NotFound, "Ban chua nop ho so nao.")
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
                StatusCodes.Status404NotFound, "Khong tim thay ho so.");
        }

        var a = record.Application;

        return ServiceResult<LandlordApplicationDetailResponse>.Ok(new LandlordApplicationDetailResponse(
            a.Id,
            a.UserId,
            record.User.FullName,
            record.User.Email!,
            record.User.PhoneNumber,
            a.IdCardNumber,
            await _fileStorage.CreateSignedUrlAsync(a.IdCardFrontUrl, DocumentUrlLifetime, cancellationToken),
            await _fileStorage.CreateSignedUrlAsync(a.IdCardBackUrl, DocumentUrlLifetime, cancellationToken),
            await _fileStorage.CreateSignedUrlAsync(a.OwnershipDocumentUrl, DocumentUrlLifetime, cancellationToken),
            a.Status,
            a.SubmittedAt,
            a.ReviewedAt,
            a.RejectReason));
    }

    /// <summary>FR-08: duyệt hồ sơ và cấp vai trò Chủ trọ.</summary>
    public async Task<ServiceResult> ApproveAsync(
        long adminUserId,
        long applicationId,
        CancellationToken cancellationToken = default)
    {
        var application = await _db.LandlordApplications
            .FirstOrDefaultAsync(a => a.Id == applicationId, cancellationToken);

        if (application is null)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Khong tim thay ho so.");
        }

        if (application.Status != LandlordApplicationStatus.ChoDuyet)
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, "Ho so nay khong con cho duyet.");
        }

        var applicant = await _userManager.FindByIdAsync(application.UserId.ToString());

        if (applicant is null)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Khong tim thay nguoi nop ho so.");
        }

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        var previous = application.Status;
        application.Status = LandlordApplicationStatus.DaDuyet;
        application.ReviewedByUserId = adminUserId;
        application.ReviewedAt = DateTimeOffset.UtcNow;

        _auditLogger.Write(
            adminUserId,
            "DuyetHoSoChuTro",
            nameof(LandlordApplication),
            application.Id,
            new { Status = previous.ToString() },
            new { Status = application.Status.ToString() });

        _notifier.Notify(
            application.UserId,
            "HoSoChuTroDuocDuyet",
            "Ho so Chu tro da duoc duyet",
            "Ban da duoc cap quyen Chu tro va co the bat dau dang tin cho thue.",
            nameof(LandlordApplication),
            application.Id);

        await _db.SaveChangesAsync(cancellationToken);

        var roleResult = await _userManager.AddToRoleAsync(applicant, AppRoles.Landlord);

        if (!roleResult.Succeeded)
        {
            await transaction.RollbackAsync(cancellationToken);

            return ServiceResult.Fail(
                StatusCodes.Status500InternalServerError,
                "Khong cap duoc vai tro Chu tro: " +
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
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Khong tim thay ho so.");
        }

        if (application.Status != LandlordApplicationStatus.ChoDuyet)
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, "Ho so nay khong con cho duyet.");
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
            "Ho so Chu tro bi tu choi",
            $"Ly do: {reason}. Ban co the bo sung va nop lai ho so moi.",
            nameof(LandlordApplication),
            application.Id);

        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    private static LandlordApplicationResponse ToResponse(LandlordApplication a)
        => new(a.Id, a.Status, a.SubmittedAt, a.ReviewedAt, a.RejectReason);
}
