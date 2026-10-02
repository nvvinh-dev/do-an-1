using Microsoft.EntityFrameworkCore;
using SmartRent.Api.Contracts;
using SmartRent.Infrastructure.Identity;
using SmartRent.Infrastructure.Persistence;

namespace SmartRent.Api.Services;

/// <summary>Quản lý tài khoản người dùng — FR-09.</summary>
public class UserAdminService
{
    private readonly AppDbContext _db;
    private readonly AuditLogger _auditLogger;
    private readonly Notifier _notifier;

    public UserAdminService(
        AppDbContext db,
        AuditLogger auditLogger,
        Notifier notifier)
    {
        _db = db;
        _auditLogger = auditLogger;
        _notifier = notifier;
    }

    public async Task<PagedResponse<UserListItemResponse>> ListAsync(
        string? role,
        bool? isLocked,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Users.AsNoTracking();

        if (isLocked is not null)
        {
            query = query.Where(u => u.IsLocked == isLocked);
        }

        if (!string.IsNullOrWhiteSpace(role))
        {
            var userIds = from userRole in _db.UserRoles
                          join appRole in _db.Roles on userRole.RoleId equals appRole.Id
                          where appRole.Name == role
                          select userRole.UserId;

            query = query.Where(u => userIds.Contains(u.Id));
        }

        var total = await query.CountAsync(cancellationToken);

        var users = await query
            .OrderBy(u => u.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        // Vai trò của cả trang lấy bằng một truy vấn, không gọi riêng cho từng tài khoản.
        var pageUserIds = users.Select(u => u.Id).ToList();

        var rolesByUser = (await (from userRole in _db.UserRoles
                                  join appRole in _db.Roles on userRole.RoleId equals appRole.Id
                                  where pageUserIds.Contains(userRole.UserId)
                                  select new { userRole.UserId, appRole.Name })
                                 .ToListAsync(cancellationToken))
            .ToLookup(r => r.UserId, r => r.Name!);

        var items = users
            .Select(user => new UserListItemResponse(
                user.Id,
                user.Email!,
                user.FullName,
                user.PhoneNumber,
                user.IsLocked,
                user.LockReason,
                user.RegisteredAt,
                [.. rolesByUser[user.Id]]))
            .ToList();

        return new PagedResponse<UserListItemResponse>(
            items, page, pageSize, total, (int)Math.Ceiling(total / (double)pageSize));
    }

    public async Task<ServiceResult> LockAsync(
        long adminUserId,
        long targetUserId,
        string reason,
        CancellationToken cancellationToken = default)
    {
        // Tự khóa chính mình sẽ làm mất quyền quản trị và không có đường khôi phục
        // trong hệ thống, nên chặn từ đầu.
        if (adminUserId == targetUserId)
        {
            return ServiceResult.Fail(
                StatusCodes.Status422UnprocessableEntity, "Không thể tự khóa tài khoản của chính mình.");
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == targetUserId, cancellationToken);

        if (user is null)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy tài khoản.");
        }

        if (user.IsLocked)
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, "Tài khoản đã bị khóa.");
        }

        user.IsLocked = true;
        user.LockReason = reason;

        _auditLogger.Write(
            adminUserId,
            "KhoaTaiKhoan",
            nameof(AppUser),
            user.Id,
            new { IsLocked = false },
            new { IsLocked = true, Reason = reason });

        _notifier.Notify(
            user.Id,
            "TaiKhoanBiKhoa",
            "Tài khoản của bạn đã bị khóa",
            $"Lý do: {reason}.",
            nameof(AppUser),
            user.Id);

        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> UnlockAsync(
        long adminUserId,
        long targetUserId,
        CancellationToken cancellationToken = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == targetUserId, cancellationToken);

        if (user is null)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy tài khoản.");
        }

        if (!user.IsLocked)
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, "Tài khoản đang không bị khóa.");
        }

        var previousReason = user.LockReason;
        user.IsLocked = false;
        user.LockReason = null;

        _auditLogger.Write(
            adminUserId,
            "MoKhoaTaiKhoan",
            nameof(AppUser),
            user.Id,
            new { IsLocked = true, Reason = previousReason },
            new { IsLocked = false });

        _notifier.Notify(
            user.Id,
            "TaiKhoanDuocMoKhoa",
            "Tài khoản của bạn đã được mở khóa",
            "Bạn có thể đăng nhập và sử dụng hệ thống bình thường.",
            nameof(AppUser),
            user.Id);

        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Ok();
    }
}
