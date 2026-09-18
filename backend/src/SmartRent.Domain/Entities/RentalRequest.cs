using SmartRent.Domain.Enums;

namespace SmartRent.Domain.Entities;

/// <summary>
/// Yêu cầu thuê một phòng cụ thể. Khi một yêu cầu được duyệt, toàn bộ yêu cầu khác
/// của cùng phòng đang chờ duyệt phải tự chuyển sang TuChoi.
/// </summary>
public class RentalRequest
{
    public long Id { get; set; }

    public long RoomId { get; set; }

    public Room Room { get; set; } = null!;

    public long TenantUserId { get; set; }

    public DateOnly ExpectedMoveInDate { get; set; }

    public int ExpectedOccupants { get; set; }

    public string? Note { get; set; }

    public RentalRequestStatus Status { get; set; }

    public DateTimeOffset SubmittedAt { get; set; }

    /// <summary>Thời điểm Chủ trọ duyệt hoặc từ chối.</summary>
    public DateTimeOffset? ProcessedAt { get; set; }

    /// <summary>Bắt buộc có giá trị khi <see cref="Status"/> là TuChoi.</summary>
    public string? RejectReason { get; set; }
}
