using SmartRent.Domain.Enums;

namespace SmartRent.Domain.Entities;

/// <summary>
/// Hợp đồng thuê. Giá và phí được chốt cứng tại thời điểm tạo — sửa giá ở mức phòng
/// sau đó không ảnh hưởng tới hợp đồng này.
/// Chỉ có tối đa một hợp đồng đang chiếm dụng một phòng tại một thời điểm.
/// </summary>
public class Contract
{
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

    public DateOnly StartDate { get; set; }

    public DateOnly EndDate { get; set; }

    /// <summary>Ngày chốt số hằng kỳ.</summary>
    public int BillingCycleDay { get; set; }

    /// <summary>Số ngày được phép thanh toán kể từ khi hóa đơn phát hành.</summary>
    public int PaymentDueDays { get; set; }

    public ContractStatus Status { get; set; }

    /// <summary>Thời điểm người thuê đồng ý điều khoản.</summary>
    public DateTimeOffset? TenantConfirmedAt { get; set; }

    /// <summary>Thời điểm Chủ trọ xác nhận đã nhận đủ cọc.</summary>
    public DateTimeOffset? DepositReceivedAt { get; set; }

    public string? DepositReceivedMethod { get; set; }

    /// <summary>Chỉ có giá trị khi cả hai điều kiện hiệu lực đã hoàn tất.</summary>
    public DateTimeOffset? ActivatedAt { get; set; }

    public DateTimeOffset? MoveOutNoticeAt { get; set; }

    public DateOnly? ExpectedMoveOutDate { get; set; }

    public DateTimeOffset? TerminatedAt { get; set; }

    public string? TerminationReason { get; set; }

    /// <summary>Bắt buộc có giá trị khi <see cref="Status"/> là DaHuy.</summary>
    public string? CancelReason { get; set; }

    public ICollection<ContractServiceFee> ServiceFees { get; set; } = [];

    public ICollection<ContractOccupant> Occupants { get; set; } = [];

    public ICollection<Invoice> Invoices { get; set; } = [];
}
