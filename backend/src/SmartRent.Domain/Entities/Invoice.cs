using SmartRent.Domain.Enums;

namespace SmartRent.Domain.Entities;

/// <summary>
/// Hóa đơn của một kỳ. Lưu kèm bản sao đơn giá đã áp dụng nên hóa đơn đã phát hành
/// không bị tính lại khi giá thay đổi. Hóa đơn đã thanh toán không được sửa —
/// sai sót được điều chỉnh bằng một dòng DieuChinhKhac trỏ về hóa đơn gốc,
/// đặt ở hóa đơn kỳ kế tiếp hoặc hóa đơn thanh lý (BR-16).
/// </summary>
public class Invoice
{
    /// <summary>
    /// Hóa đơn đã phát hành còn phải thu — "hóa đơn chưa thu" trên dashboard (api-design mục 12). Không gồm Nháp
    /// (chưa phát hành) và Đã chuyển thanh lý (phần nợ đã nằm trong hóa đơn thanh lý).
    /// </summary>
    public static readonly InvoiceStatus[] OutstandingStatuses =
        [InvoiceStatus.ChuaThanhToan, InvoiceStatus.ChoXacNhan, InvoiceStatus.ThanhToanMotPhan, InvoiceStatus.QuaHan];

    /// <summary>
    /// Hóa đơn còn nợ được kết chuyển vào hóa đơn thanh lý (FR-92, database-design mục 6.1). Không gồm Chờ xác nhận —
    /// còn lượt báo thanh toán chờ xác nhận thì chưa lập được hóa đơn thanh lý.
    /// </summary>
    public static readonly InvoiceStatus[] CarryOverStatuses =
        [InvoiceStatus.ChuaThanhToan, InvoiceStatus.ThanhToanMotPhan, InvoiceStatus.QuaHan];

    public long Id { get; set; }

    public long ContractId { get; set; }

    public Contract Contract { get; set; } = null!;

    public InvoiceType Type { get; set; }

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

    /// <summary>Chỉ với hóa đơn thanh lý: thời điểm người thuê đồng ý bảng thanh lý.</summary>
    public DateTimeOffset? TenantConfirmedAt { get; set; }

    /// <summary>Chỉ với hóa đơn thanh lý: lý do người thuê chưa đồng ý ở lần gần nhất.</summary>
    public string? ChangeRequestReason { get; set; }

    /// <summary>Chỉ với hóa đơn thanh lý: lần gửi gần nhất cho người thuê — mốc tính 7 ngày Chủ trọ được tự chốt.</summary>
    public DateTimeOffset? SentAt { get; set; }

    /// <summary>Chỉ với hóa đơn thanh lý: ghi chú bắt buộc khi Chủ trọ tự chốt.</summary>
    public string? LandlordFinalizeNote { get; set; }

    /// <summary>Bắt buộc có giá trị khi <see cref="Status"/> là DaHuy.</summary>
    public string? CancelReason { get; set; }

    public ICollection<InvoiceLine> Lines { get; set; } = [];

    public ICollection<PaymentReport> PaymentReports { get; set; } = [];

    /// <summary>Hóa đơn còn nợ, được kết chuyển khi lập hóa đơn thanh lý (FR-92).</summary>
    public bool CanCarryOverToSettlement => throw new NotImplementedException();

    /// <summary>
    /// FR-92: phần còn phải trả (tổng tiền trừ số đã được xác nhận thu) trở thành một dòng <see cref="InvoiceLineCategory.CongNoKyTruoc"/> trỏ về hóa đơn này,
    /// và hóa đơn chuyển Đã chuyển thanh lý — không còn bị nhắc quá hạn, không nhận báo thanh toán riêng.
    /// Service thêm dòng trả về vào hóa đơn thanh lý trong cùng transaction.
    /// </summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="CanCarryOverToSettlement"/> sai — lỗi lập trình.</exception>
    public InvoiceLine CarryOverToSettlement() => throw new NotImplementedException();
}
