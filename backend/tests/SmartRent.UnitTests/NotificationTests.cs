using SmartRent.Domain.Entities;

namespace SmartRent.UnitTests;

/// <summary>Đánh dấu đã đọc — FR-61, api-design mục 11.</summary>
public class NotificationTests
{
    private static readonly DateTimeOffset CreatedAt = new(2026, 10, 7, 2, 0, 0, TimeSpan.Zero);

    private static Notification Unread() => new()
    {
        Id = 1,
        RecipientUserId = 20,
        EventType = "HopDongChoXacNhan",
        Title = "Hợp đồng chờ bạn xác nhận",
        Content = "Chủ trọ đã gửi hợp đồng.",
        IsRead = false,
        CreatedAt = CreatedAt
    };

    [Fact]
    public void MarkAsRead_ChuaDoc_GhiDaDocVaThoiDiemDoc()
    {
        var notification = Unread();
        var now = CreatedAt.AddHours(3);

        notification.MarkAsRead(now);

        Assert.True(notification.IsRead);
        Assert.Equal(now, notification.ReadAt);
    }

    [Fact]
    public void MarkAsRead_DaDoc_GiuThoiDiemDocLanDau()
    {
        // Gọi /read lại trên thông báo đã đọc vẫn trả 204, nhưng không ghi đè lúc đọc lần đầu.
        var notification = Unread();
        var firstRead = CreatedAt.AddHours(3);
        notification.MarkAsRead(firstRead);

        notification.MarkAsRead(CreatedAt.AddDays(2));

        Assert.True(notification.IsRead);
        Assert.Equal(firstRead, notification.ReadAt);
    }
}
