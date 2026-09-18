using SmartRent.Domain.Enums;

namespace SmartRent.Domain.Entities;

/// <summary>
/// Hóa đơn của một kỳ. Lưu kèm bản sao đơn giá đã áp dụng nên hóa đơn đã phát hành
/// không bị tính lại khi giá thay đổi. Hóa đơn đã thanh toán không được sửa —
/// mọi điều chỉnh phải tạo hóa đơn mới tham chiếu về hóa đơn gốc.
/// </summary>
public class Invoice
{
    public long Id { get; set; }

    public long ContractId { get; set; }

    public Contract Contract { get; set; } = null!;

    public InvoiceType Type { get; set; }

    /// <summary>Bắt buộc có giá trị khi <see cref="Type"/> là DieuChinh.</summary>
    public long? AdjustedInvoiceId { get; set; }

    public Invoice? AdjustedInvoice { get; set; }

    public DateOnly PeriodStart { get; set; }

    public DateOnly PeriodEnd { get; set; }

    /// <summary>Bằng chỉ số mới của kỳ liền trước; hệ thống tự điền, không nhận từ client.</summary>
    public decimal PreviousElectricityIndex { get; set; }

    public decimal CurrentElectricityIndex { get; set; }

    /// <summary>Bản sao đơn giá đã áp dụng, lấy từ hợp đồng.</summary>
    public decimal ElectricityUnitPrice { get; set; }

    public decimal ElectricityAmount { get; set; }

    public decimal PreviousWaterIndex { get; set; }

    public decimal CurrentWaterIndex { get; set; }

    /// <summary>Bản sao đơn giá đã áp dụng, lấy từ hợp đồng.</summary>
    public decimal WaterUnitPrice { get; set; }

    public decimal WaterAmount { get; set; }

    /// <summary>Kỳ đầu và kỳ cuối không trọn tháng thì tính theo tỷ lệ số ngày thực ở.</summary>
    public decimal RentAmount { get; set; }

    public decimal ServiceFeeAmount { get; set; }

    /// <summary>Tổng cộng, đã bao gồm các dòng ở <see cref="Lines"/>. Có thể âm với hóa đơn thanh lý.</summary>
    public decimal TotalAmount { get; set; }

    /// <summary>Số tiền đã thu và đã được Chủ trọ xác nhận.</summary>
    public decimal PaidAmount { get; set; }

    public InvoiceStatus Status { get; set; }

    public string? ElectricityMeterPhotoUrl { get; set; }

    public string? WaterMeterPhotoUrl { get; set; }

    public DateTimeOffset? IssuedAt { get; set; }

    public DateOnly? DueDate { get; set; }

    public DateTimeOffset? SettledAt { get; set; }

    /// <summary>Bắt buộc có giá trị khi <see cref="Status"/> là DaHuy.</summary>
    public string? CancelReason { get; set; }

    public ICollection<InvoiceLine> Lines { get; set; } = [];

    public ICollection<PaymentReport> PaymentReports { get; set; } = [];
}
