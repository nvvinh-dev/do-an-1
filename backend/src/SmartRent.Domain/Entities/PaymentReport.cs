using SmartRent.Domain.Enums;

namespace SmartRent.Domain.Entities;

/// <summary>
/// Một lượt người thuê báo đã thanh toán kèm minh chứng.
/// Chỉ Chủ trọ sở hữu mới xác nhận được. Một hóa đơn có thể có nhiều lượt báo.
/// </summary>
public class PaymentReport
{
    public long Id { get; set; }

    public long InvoiceId { get; set; }

    public Invoice Invoice { get; set; } = null!;

    /// <summary>Số tiền người thuê khai đã trả.</summary>
    public decimal ReportedAmount { get; set; }

    /// <summary>Minh chứng chuyển khoản. Bắt buộc.</summary>
    public string ProofImageUrl { get; set; } = string.Empty;

    public DateTimeOffset ReportedAt { get; set; }

    public PaymentReportStatus Status { get; set; }

    public long? ConfirmedByUserId { get; set; }

    public DateTimeOffset? ConfirmedAt { get; set; }

    /// <summary>Số tiền Chủ trọ xác nhận thực thu.</summary>
    public decimal? ConfirmedAmount { get; set; }

    /// <summary>Bắt buộc có giá trị khi <see cref="Status"/> là TuChoiXacNhan.</summary>
    public string? RejectReason { get; set; }
}
