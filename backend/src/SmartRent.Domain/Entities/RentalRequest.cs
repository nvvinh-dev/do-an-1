using SmartRent.Domain.Enums;

namespace SmartRent.Domain.Entities;

/// <summary>
/// Yêu cầu thuê một phòng cụ thể. Khi một yêu cầu được duyệt, toàn bộ yêu cầu khác
/// của cùng phòng đang chờ duyệt phải tự chuyển sang TuChoi.
/// </summary>
public class RentalRequest
{
    /// <summary>Chủ trọ có 168 giờ (7 ngày) kể từ lúc gửi để xử lý (BP-06 A2).</summary>
    public static readonly TimeSpan ReviewWindow = TimeSpan.FromHours(168);

    /// <summary>
    /// Hạn giữ chỗ 72 giờ (3 ngày) kể từ lúc duyệt, gồm cả thời gian lập hợp đồng,
    /// xác nhận điều khoản và nộp cọc (BP-06 A3).
    /// </summary>
    public static readonly TimeSpan HoldWindow = TimeSpan.FromHours(72);

    public long Id { get; set; }

    public long RoomId { get; set; }

    public Room Room { get; set; } = null!;

    public long TenantUserId { get; set; }

    public DateOnly ExpectedMoveInDate { get; set; }

    public int ExpectedOccupants { get; set; }

    public string? Note { get; set; }

    public RentalRequestStatus Status { get; set; }

    public DateTimeOffset SubmittedAt { get; set; }

    /// <summary>Thời điểm Chủ trọ duyệt, từ chối hoặc hủy duyệt — lần xử lý gần nhất.</summary>
    public DateTimeOffset? ProcessedAt { get; set; }

    /// <summary>Bắt buộc có giá trị khi <see cref="Status"/> là TuChoi.</summary>
    public string? RejectReason { get; set; }

    /// <summary>Hạn Chủ trọ phải xử lý yêu cầu.</summary>
    public DateTimeOffset ReviewDeadline => SubmittedAt + ReviewWindow;

    /// <summary>
    /// Hạn giữ chỗ, tính từ lúc duyệt. Yêu cầu đã lập hợp đồng giữ nguyên thời điểm duyệt,
    /// nên đây cũng là hạn giữ chỗ của hợp đồng lập từ yêu cầu này.
    /// </summary>
    public DateTimeOffset? HoldDeadline => ProcessedAt + HoldWindow;

    /// <summary>
    /// Đang chờ duyệt và chưa quá hạn xử lý. Thao tác của người dùng tự kiểm tra hạn,
    /// không chờ tác vụ định kỳ chuyển yêu cầu sang HetHan.
    /// </summary>
    public bool IsAwaitingReview(DateTimeOffset now)
        => Status == RentalRequestStatus.ChoDuyet && now <= ReviewDeadline;

    /// <summary>Đã duyệt, chưa lập hợp đồng và còn trong hạn giữ chỗ.</summary>
    public bool IsHoldingRoom(DateTimeOffset now)
        => Status == RentalRequestStatus.DaDuyet && now <= HoldDeadline;
}
