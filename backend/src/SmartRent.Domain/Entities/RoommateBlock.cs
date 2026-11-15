namespace SmartRent.Domain.Entities;

/// <summary>
/// Chặn trong ở ghép (BP-11). Có hiệu lực cả hai chiều khi lọc ứng viên, xem hồ sơ và gửi lời mời (FR-118);
/// bỏ chặn xóa dòng.
/// </summary>
public class RoommateBlock
{
    public long Id { get; set; }

    public long BlockerUserId { get; set; }

    public long BlockedUserId { get; set; }

    public DateTimeOffset BlockedAt { get; set; }
}
