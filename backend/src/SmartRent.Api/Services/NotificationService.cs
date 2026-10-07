using Microsoft.EntityFrameworkCore;
using SmartRent.Api.Contracts;
using SmartRent.Infrastructure.Persistence;

namespace SmartRent.Api.Services;

/// <summary>
/// Người dùng xem, đếm chưa đọc và đánh dấu đã đọc thông báo của chính mình — FR-61.
/// Thông báo chỉ do backend sinh qua <see cref="Notifier"/> khi sự kiện nghiệp vụ xảy ra; ở đây không có thao tác tạo.
/// </summary>
public class NotificationService
{
    private readonly AppDbContext _db;

    public NotificationService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>Thông báo của người gọi, mới nhất trước; <paramref name="isRead"/> null thì lấy cả hai loại.</summary>
    public async Task<PagedResponse<NotificationResponse>> ListAsync(
        long userId,
        bool? isRead,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Notifications
            .AsNoTracking()
            .Where(n => n.RecipientUserId == userId);

        if (isRead is not null)
        {
            query = query.Where(n => n.IsRead == isRead);
        }

        var total = await query.CountAsync(cancellationToken);

        // Hai thông báo sinh trong cùng một lần lưu có cùng CreatedAt; xếp thêm theo id để thứ tự giữa các trang ổn định.
        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .ThenByDescending(n => n.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NotificationResponse(
                n.Id,
                n.EventType,
                n.Title,
                n.Content,
                n.RelatedEntityType,
                n.RelatedEntityId,
                n.IsRead,
                n.CreatedAt))
            .ToListAsync(cancellationToken);

        return new PagedResponse<NotificationResponse>(
            items, page, pageSize, total, (int)Math.Ceiling(total / (double)pageSize));
    }

    /// <summary>Dùng index (recipient_user_id, is_read).</summary>
    public async Task<UnreadNotificationCountResponse> CountUnreadAsync(
        long userId,
        CancellationToken cancellationToken = default)
        => new(await _db.Notifications.CountAsync(n => n.RecipientUserId == userId && !n.IsRead, cancellationToken));

    /// <summary>Thông báo của người khác trả 404 như không tồn tại; đã đọc rồi vẫn thành công.</summary>
    public async Task<ServiceResult> MarkAsReadAsync(
        long userId,
        long id,
        CancellationToken cancellationToken = default)
    {
        var notification = await _db.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.RecipientUserId == userId, cancellationToken);

        if (notification is null)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy thông báo.");
        }

        notification.MarkAsRead(DateTimeOffset.UtcNow);
        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    public async Task MarkAllAsReadAsync(long userId, CancellationToken cancellationToken = default)
    {
        var unread = await _db.Notifications
            .Where(n => n.RecipientUserId == userId && !n.IsRead)
            .ToListAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;

        foreach (var notification in unread)
        {
            notification.MarkAsRead(now);
        }

        await _db.SaveChangesAsync(cancellationToken);
    }
}
