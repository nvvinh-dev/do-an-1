namespace SmartRent.Api.Contracts;

/// <summary>
/// Một dòng trong danh sách thông báo. Giao diện dùng <see cref="RelatedEntityType"/> và
/// <see cref="RelatedEntityId"/> để dẫn tới trang tương ứng.
/// </summary>
public record NotificationResponse(
    long Id,
    string EventType,
    string Title,
    string Content,
    string? RelatedEntityType,
    long? RelatedEntityId,
    bool IsRead,
    DateTimeOffset CreatedAt);

public record UnreadNotificationCountResponse(int Count);
