using SmartRent.Domain.Enums;

namespace SmartRent.Domain.Entities;

/// <summary>
/// Hợp đồng thuê. Giá và phí được chốt cứng tại thời điểm tạo — sửa giá ở mức phòng
/// sau đó không ảnh hưởng tới hợp đồng này.
/// Chỉ có tối đa một hợp đồng đang chiếm dụng một phòng tại một thời điểm.
/// </summary>
public class Contract
{
    /// <summary>Hợp đồng chưa có hiệu lực: phòng đang được giữ chỗ cho hợp đồng này (BR-28).</summary>
    public static readonly ContractStatus[] AwaitingActivationStatuses =
        [ContractStatus.Nhap, ContractStatus.ChoNguoiThueXacNhan, ContractStatus.ChoNhanCoc];

    /// <summary>Hợp đồng đang chiếm dụng phòng — mỗi phòng tối đa một hợp đồng ở các trạng thái này (BR-07).</summary>
    public static readonly ContractStatus[] OccupyingStatuses =
        [ContractStatus.DangHieuLuc, ContractStatus.SapHetHan, ContractStatus.DangThanhLy];

    public long Id { get; set; }

    public long RoomId { get; set; }

    public Room Room { get; set; } = null!;

    /// <summary>Người đứng tên, chịu toàn bộ nghĩa vụ tài chính.</summary>
    public long TenantUserId { get; set; }

    public long? RentalRequestId { get; set; }

    public RentalRequest? RentalRequest { get; set; }

    public decimal RentPrice { get; set; }

    public decimal ElectricityUnitPrice { get; set; }

    public decimal WaterUnitPrice { get; set; }

    /// <summary>Bắt buộc ghi nhận; giá trị 0 được chấp nhận nếu hai bên thỏa thuận không cọc.</summary>
    public decimal DepositAmount { get; set; }

    /// <summary>Chỉ số điện lúc bàn giao phòng — chỉ số cũ của hóa đơn đầu tiên (BR-14).</summary>
    public decimal InitialElectricityIndex { get; set; }

    /// <summary>Chỉ số nước lúc bàn giao phòng — chỉ số cũ của hóa đơn đầu tiên (BR-14).</summary>
    public decimal InitialWaterIndex { get; set; }

    public DateOnly StartDate { get; set; }

    public DateOnly EndDate { get; set; }

    /// <summary>Số ngày được phép thanh toán kể từ khi hóa đơn phát hành.</summary>
    public int PaymentDueDays { get; set; }

    public ContractStatus Status { get; set; }

    /// <summary>Thời điểm người thuê đồng ý điều khoản.</summary>
    public DateTimeOffset? TenantConfirmedAt { get; set; }

    /// <summary>Thời điểm nhận cọc thực tế do Chủ trọ nhập, không sau thời điểm xác nhận.</summary>
    public DateTimeOffset? DepositReceivedAt { get; set; }

    public PaymentMethod? DepositReceivedMethod { get; set; }

    /// <summary>
    /// Số tiền cọc đã hoàn. Server tính khi Chủ trọ hủy (toàn bộ cọc) và khi hóa đơn thanh lý có số dư âm
    /// (phần cọc dư); Chủ trọ nhập, trong khoảng 0 tới tiền cọc, khi Người thuê hủy (BR-22).
    /// </summary>
    public decimal? DepositRefundedAmount { get; set; }

    public DateTimeOffset? DepositRefundedAt { get; set; }

    public PaymentMethod? DepositRefundMethod { get; set; }

    /// <summary>Lý do giữ lại cọc — bắt buộc khi Người thuê hủy và số hoàn nhỏ hơn tiền cọc.</summary>
    public string? DepositRefundNote { get; set; }

    /// <summary>Chỉ có giá trị khi cả hai điều kiện hiệu lực đã hoàn tất.</summary>
    public DateTimeOffset? ActivatedAt { get; set; }

    public DateTimeOffset? MoveOutNoticeAt { get; set; }

    /// <summary>Bên gửi thông báo trả phòng — căn cứ cho phí phạt (BR-22).</summary>
    public long? MoveOutNoticeByUserId { get; set; }

    public DateOnly? ExpectedMoveOutDate { get; set; }

    public DateTimeOffset? TerminatedAt { get; set; }

    public string? TerminationReason { get; set; }

    /// <summary>Bắt buộc có giá trị khi <see cref="Status"/> là DaHuy.</summary>
    public string? CancelReason { get; set; }

    /// <summary>Bên hủy hợp đồng; null khi hệ thống tự hủy do hết hạn giữ chỗ.</summary>
    public long? CancelledByUserId { get; set; }

    public DateTimeOffset? CancelledAt { get; set; }

    public ICollection<ContractServiceFee> ServiceFees { get; set; } = [];

    public ICollection<ContractOccupant> Occupants { get; set; } = [];

    public ICollection<Invoice> Invoices { get; set; } = [];

    public bool IsAwaitingActivation => AwaitingActivationStatuses.Contains(Status);

    /// <summary>Đã kết thúc vòng đời: đã thanh lý hoặc đã hủy.</summary>
    public bool IsClosed => Status is ContractStatus.DaThanhLy or ContractStatus.DaHuy;

    /// <summary>
    /// Hạn giữ chỗ của hợp đồng chưa có hiệu lực — 72 giờ kể từ khi duyệt yêu cầu thuê gốc.
    /// Cần nạp <see cref="RentalRequest"/>.
    /// </summary>
    public DateTimeOffset? HoldDeadline => IsAwaitingActivation ? RentalRequest?.HoldDeadline : null;

    /// <summary>
    /// Hợp đồng chưa hiệu lực đã quá hạn giữ chỗ. Thao tác của người dùng tự kiểm tra hạn,
    /// không chờ tác vụ định kỳ hủy hợp đồng.
    /// </summary>
    public bool IsHoldExpired(DateTimeOffset now) => HoldDeadline is { } deadline && now > deadline;

    /// <summary>Đã hủy, đã nhận cọc mà Chủ trọ chưa ghi nhận hoàn cọc.</summary>
    public bool IsAwaitingDepositRefund
        => Status == ContractStatus.DaHuy && DepositReceivedAt is not null && DepositRefundedAt is null;

    public bool WasCancelledByTenant => Status == ContractStatus.DaHuy && CancelledByUserId == TenantUserId;

    /// <summary>
    /// BR-21: người thuê đồng ý điều khoản. Tiền cọc bằng 0 thì hợp đồng có hiệu lực ngay;
    /// ngược lại chờ Chủ trọ xác nhận nhận cọc.
    /// </summary>
    /// <returns><c>true</c> khi hợp đồng vừa chuyển sang Đang hiệu lực.</returns>
    public bool ConfirmByTenant(DateTimeOffset now)
    {
        TenantConfirmedAt = now;

        if (DepositAmount > 0)
        {
            Status = ContractStatus.ChoNhanCoc;
            return false;
        }

        Activate(now);
        return true;
    }

    /// <summary>BR-21: Chủ trọ xác nhận đã nhận cọc sau khi người thuê đã đồng ý; hợp đồng có hiệu lực.</summary>
    public void ConfirmDeposit(DateTimeOffset receivedAt, PaymentMethod method, DateTimeOffset now)
    {
        DepositReceivedAt = receivedAt;
        DepositReceivedMethod = method;
        Activate(now);
    }

    /// <summary>BP-06 A6: Chủ trọ thu hồi để sửa; lần đồng ý trước đó của người thuê bị bỏ.</summary>
    public void Recall()
    {
        Status = ContractStatus.Nhap;
        TenantConfirmedAt = null;
    }

    /// <summary>
    /// BR-22: chỉ hủy được trước ngày bắt đầu — hợp đồng chưa hiệu lực, hoặc đã hiệu lực mà chưa tới
    /// <see cref="StartDate"/>. Hợp đồng đã bắt đầu chỉ kết thúc qua thanh lý.
    /// </summary>
    /// <param name="today">Ngày hiện tại theo lịch Việt Nam.</param>
    public bool CanBeCancelled(DateOnly today)
        => IsAwaitingActivation || (Status == ContractStatus.DangHieuLuc && today < StartDate);

    /// <param name="cancelledByUserId">Bên hủy; null khi hệ thống tự hủy do hết hạn giữ chỗ.</param>
    public void Cancel(long? cancelledByUserId, string reason, DateTimeOffset now)
    {
        Status = ContractStatus.DaHuy;
        CancelReason = reason;
        CancelledByUserId = cancelledByUserId;
        CancelledAt = now;
    }

    private void Activate(DateTimeOffset now)
    {
        Status = ContractStatus.DangHieuLuc;
        ActivatedAt = now;
    }
}
