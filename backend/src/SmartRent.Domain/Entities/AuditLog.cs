namespace SmartRent.Domain.Entities;

/// <summary>
/// Nhật ký hệ thống cho các thao tác ảnh hưởng tới tiền hoặc quyền.
/// Bảng này chỉ được INSERT — không có chức năng nào cho phép sửa hay xóa,
/// kể cả với vai trò Admin. Đây là cơ sở đối chứng duy nhất khi xử lý khiếu nại.
/// </summary>
public class AuditLog
{
    public long Id { get; set; }

    public long ActorUserId { get; set; }

    public string Action { get; set; } = string.Empty;

    public string EntityType { get; set; } = string.Empty;

    public long EntityId { get; set; }

    /// <summary>Giá trị trước, dạng JSON.</summary>
    public string? OldValue { get; set; }

    /// <summary>Giá trị sau, dạng JSON.</summary>
    public string? NewValue { get; set; }

    public DateTimeOffset OccurredAt { get; set; }
}
