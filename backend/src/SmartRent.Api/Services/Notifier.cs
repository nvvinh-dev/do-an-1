using SmartRent.Domain.Entities;
using SmartRent.Infrastructure.Persistence;

namespace SmartRent.Api.Services;

/// <summary>
/// Tạo thông báo trong ứng dụng. Phase 1 chỉ gửi cho các sự kiện ở mức Cao
/// trong danh mục sự kiện thông báo.
/// Giống <see cref="AuditLogger"/>, chỉ thêm vào DbContext chứ không lưu.
/// </summary>
public class Notifier
{
    private readonly AppDbContext _db;

    public Notifier(AppDbContext db)
    {
        _db = db;
    }

    public void Notify(
        long recipientUserId,
        string eventType,
        string title,
        string content,
        string? relatedEntityType = null,
        long? relatedEntityId = null)
    {
        _db.Notifications.Add(new Notification
        {
            RecipientUserId = recipientUserId,
            EventType = eventType,
            Title = title,
            Content = content,
            RelatedEntityType = relatedEntityType,
            RelatedEntityId = relatedEntityId,
            IsRead = false,
            CreatedAt = DateTimeOffset.UtcNow
        });
    }
}
