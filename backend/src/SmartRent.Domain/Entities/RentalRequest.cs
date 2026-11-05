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

    /// <summary>FR-30: Chủ trọ chỉ duyệt yêu cầu đang chờ và chưa quá hạn xử lý.</summary>
    public bool CanApprove(DateTimeOffset now) => IsAwaitingReview(now);

    /// <summary>
    /// FR-29, BP-06 A5: Chủ trọ từ chối yêu cầu đang chờ, hoặc hủy duyệt yêu cầu đã duyệt mà chưa lập hợp đồng và
    /// còn hạn giữ chỗ.
    /// </summary>
    public bool CanReject(DateTimeOffset now) => IsAwaitingReview(now) || IsHoldingRoom(now);

    /// <summary>FR-27: người thuê rút yêu cầu ở cùng các trạng thái Chủ trọ từ chối được.</summary>
    public bool CanWithdraw(DateTimeOffset now) => CanReject(now);

    /// <summary>
    /// Tác vụ định kỳ — FR-28: đang chờ duyệt mà đã quá 168 giờ. Thao tác của người dùng không cần chờ việc này
    /// (<see cref="IsAwaitingReview"/> đã tự kiểm tra hạn).
    /// </summary>
    public bool ShouldExpireUnreviewed(DateTimeOffset now)
        => Status == RentalRequestStatus.ChoDuyet && now > ReviewDeadline;

    /// <summary>
    /// FR-36: đã duyệt, chưa lập hợp đồng mà đã quá 72 giờ giữ chỗ. Hợp đồng đã lập mà quá hạn giữ chỗ thì hợp đồng
    /// bị hủy, yêu cầu giữ nguyên Đã lập hợp đồng.
    /// </summary>
    public bool ShouldExpireHold(DateTimeOffset now)
        => Status == RentalRequestStatus.DaDuyet && now > HoldDeadline;

    /// <summary>FR-30: Chờ duyệt → Đã duyệt; hạn giữ chỗ 72 giờ tính từ <paramref name="now"/>.</summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="CanApprove"/> sai — lỗi lập trình.</exception>
    public void Approve(DateTimeOffset now)
    {
        EnsureAllowed(CanApprove(now), nameof(Approve));

        Status = RentalRequestStatus.DaDuyet;
        ProcessedAt = now;
    }

    /// <summary>FR-29: từ chối hoặc hủy duyệt — chuyển Từ chối, ghi lý do.</summary>
    /// <returns><c>true</c> khi đây là hủy duyệt: phòng đang giữ chỗ cho yêu cầu này phải trở lại Trống.</returns>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="CanReject"/> sai — lỗi lập trình.</exception>
    public bool Reject(string reason, DateTimeOffset now)
    {
        EnsureAllowed(CanReject(now), nameof(Reject));

        var wasHoldingRoom = IsHoldingRoom(now);

        Status = RentalRequestStatus.TuChoi;
        RejectReason = reason;
        ProcessedAt = now;

        return wasHoldingRoom;
    }

    /// <summary>
    /// Hệ thống từ chối một yêu cầu còn Chờ duyệt vì phòng không còn cho thuê được, với lý do do hệ thống sinh:
    /// BR-06 (phòng vừa được duyệt cho yêu cầu khác) và FR-20 (phòng hoặc khu trọ bị lưu trữ). Từ chối cả yêu cầu
    /// đã quá 168 giờ mà tác vụ định kỳ chưa chuyển Hết hạn.
    /// </summary>
    /// <exception cref="InvalidOperationException">Gọi khi yêu cầu không ở Chờ duyệt — lỗi lập trình.</exception>
    public void RejectBySystem(string reason, DateTimeOffset now)
    {
        EnsureAllowed(Status == RentalRequestStatus.ChoDuyet, nameof(RejectBySystem));

        Status = RentalRequestStatus.TuChoi;
        RejectReason = reason;
        ProcessedAt = now;
    }

    /// <summary>FR-27: người thuê rút yêu cầu — chuyển Đã hủy.</summary>
    /// <returns><c>true</c> khi yêu cầu đang giữ chỗ: phòng phải trở lại Trống và Chủ trọ nhận thông báo.</returns>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="CanWithdraw"/> sai — lỗi lập trình.</exception>
    public bool Withdraw(DateTimeOffset now)
    {
        EnsureAllowed(CanWithdraw(now), nameof(Withdraw));

        var wasHoldingRoom = IsHoldingRoom(now);

        Status = RentalRequestStatus.DaHuy;

        return wasHoldingRoom;
    }

    /// <summary>FR-28: Chờ duyệt quá 168 giờ → Hết hạn.</summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="ShouldExpireUnreviewed"/> sai — lỗi lập trình.</exception>
    public void ExpireUnreviewed(DateTimeOffset now)
    {
        EnsureAllowed(ShouldExpireUnreviewed(now), nameof(ExpireUnreviewed));

        Status = RentalRequestStatus.HetHan;
    }

    /// <summary>FR-36: Đã duyệt quá 72 giờ mà chưa lập hợp đồng → Hết hạn.</summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="ShouldExpireHold"/> sai — lỗi lập trình.</exception>
    public void ExpireHold(DateTimeOffset now)
    {
        EnsureAllowed(ShouldExpireHold(now), nameof(ExpireHold));

        Status = RentalRequestStatus.HetHan;
    }

    /// <summary>
    /// FR-31: Đã duyệt → Đã lập hợp đồng. Giữ nguyên thời điểm duyệt, vì hạn giữ chỗ của hợp đồng tính từ đó; yêu cầu
    /// giữ trạng thái này kể cả khi hợp đồng bị hủy sau đó.
    /// </summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="IsHoldingRoom"/> sai — lỗi lập trình.</exception>
    public void MarkContractCreated(DateTimeOffset now)
    {
        EnsureAllowed(IsHoldingRoom(now), nameof(MarkContractCreated));

        Status = RentalRequestStatus.DaLapHopDong;
    }

    /// <summary>
    /// Service phải kiểm tra điều kiện bằng các hàm Can.../Should... và trả 409 (hoặc bỏ qua, với tác vụ định kỳ)
    /// trước khi đổi trạng thái; tới được đây mà điều kiện sai là lỗi lập trình, không phải lỗi nghiệp vụ.
    /// </summary>
    private void EnsureAllowed(bool allowed, string operation)
    {
        if (!allowed)
        {
            throw new InvalidOperationException($"Yêu cầu thuê {Id} ở trạng thái {Status}: không thực hiện được {operation}.");
        }
    }
}
