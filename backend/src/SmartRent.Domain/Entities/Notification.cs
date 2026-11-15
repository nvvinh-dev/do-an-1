namespace SmartRent.Domain.Entities;

/// <summary>
/// Thông báo trong ứng dụng. Chỉ được sinh bởi backend khi sự kiện nghiệp vụ xảy ra.
/// Phase 1 chỉ gửi thông báo cho các sự kiện ở mức Cao.
/// </summary>
public class Notification
{
    public long Id { get; set; }

    public long RecipientUserId { get; set; }

    /// <summary>Mã sự kiện theo danh mục sự kiện thông báo.</summary>
    public string EventType { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    /// <summary>Contract, Invoice, RentalRequest, LandlordApplication, AppUser.</summary>
    public string? RelatedEntityType { get; set; }

    public long? RelatedEntityId { get; set; }

    public bool IsRead { get; set; }

    /// <summary>Thời điểm phát sinh sự kiện.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? ReadAt { get; set; }

    /// <summary>Đánh dấu lại thông báo đã đọc không lỗi và giữ nguyên thời điểm đọc lần đầu.</summary>
    public void MarkAsRead(DateTimeOffset now)
    {
        if (IsRead)
        {
            return;
        }

        IsRead = true;
        ReadAt = now;
    }
}
