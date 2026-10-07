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

    /// <summary>
    /// FR-95: bảng thanh lý đã gửi quá chừng này mà người thuê không phản hồi thì Chủ trọ được tự chốt. Hạn bắt đầu từ
    /// một thời điểm nên tính đủ 168 giờ kể từ lần gửi gần nhất (architecture mục 7.1).
    /// </summary>
    public static readonly TimeSpan SettlementResponseWindow = TimeSpan.FromDays(7);

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
    public bool CanCarryOverToSettlement => CarryOverStatuses.Contains(Status);

    /// <summary>
    /// FR-92: phần còn phải trả (tổng tiền trừ số đã được xác nhận thu) trở thành một dòng <see cref="InvoiceLineCategory.CongNoKyTruoc"/> trỏ về hóa đơn này,
    /// và hóa đơn chuyển Đã chuyển thanh lý — không còn bị nhắc quá hạn, không nhận báo thanh toán riêng.
    /// Service thêm dòng trả về vào hóa đơn thanh lý trong cùng transaction.
    /// </summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="CanCarryOverToSettlement"/> sai — lỗi lập trình.</exception>
    public InvoiceLine CarryOverToSettlement()
    {
        if (!CanCarryOverToSettlement)
        {
            throw new InvalidOperationException(
                $"Hóa đơn {Id} ở trạng thái {Status}: không kết chuyển được vào hóa đơn thanh lý.");
        }

        var line = new InvoiceLine
        {
            Category = InvoiceLineCategory.CongNoKyTruoc,
            Description = $"Công nợ hóa đơn kỳ {PeriodStart:dd/MM/yyyy} – {PeriodEnd:dd/MM/yyyy}",
            Amount = TotalAmount - PaidAmount,
            RelatedInvoiceId = Id
        };

        Status = InvoiceStatus.DaChuyenThanhLy;

        return line;
    }

    /// <summary>FR-57: Chủ trọ gửi bảng thanh lý đang ở Nháp cho người thuê xác nhận.</summary>
    public bool CanSendSettlement => Type == InvoiceType.ThanhLy && Status == InvoiceStatus.Nhap;

    /// <summary>Bảng thanh lý đang chờ người thuê đồng ý hoặc yêu cầu sửa.</summary>
    public bool IsAwaitingTenantSettlementConfirmation
        => Type == InvoiceType.ThanhLy && Status == InvoiceStatus.ChoNguoiThueXacNhan;

    /// <summary>Lần gửi gần nhất cộng <see cref="SettlementResponseWindow"/>; null khi bảng chưa gửi.</summary>
    public DateTimeOffset? SettlementFinalizeAllowedAfter => SentAt + SettlementResponseWindow;

    /// <summary>FR-95: bảng đang chờ người thuê và đã gửi quá 7 ngày (168 giờ) kể từ lần gửi gần nhất.</summary>
    public bool CanFinalizeSettlement(DateTimeOffset now)
        => IsAwaitingTenantSettlementConfirmation && now > SettlementFinalizeAllowedAfter;

    /// <summary>FR-57: Nháp → Chờ người thuê xác nhận, ghi lần gửi gần nhất — mốc tính 7 ngày tự chốt.</summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="CanSendSettlement"/> sai — lỗi lập trình.</exception>
    public void SendSettlement(DateTimeOffset now)
    {
        EnsureAllowed(CanSendSettlement, nameof(SendSettlement));

        Status = InvoiceStatus.ChoNguoiThueXacNhan;
        SentAt = now;
    }

    /// <summary>FR-57: người thuê chưa đồng ý kèm lý do — bảng về Nháp để Chủ trọ sửa và gửi lại.</summary>
    /// <exception cref="InvalidOperationException">
    /// Gọi khi <see cref="IsAwaitingTenantSettlementConfirmation"/> sai — lỗi lập trình.
    /// </exception>
    public void RequestSettlementChanges(string reason)
    {
        EnsureAllowed(IsAwaitingTenantSettlementConfirmation, nameof(RequestSettlementChanges));

        Status = InvoiceStatus.Nhap;
        ChangeRequestReason = reason;
    }

    /// <summary>FR-57: người thuê đồng ý — bảng bị khóa theo dấu số dư (<see cref="LockSettlement"/>).</summary>
    /// <param name="paymentDueDays">Số ngày được phép thanh toán ghi trong hợp đồng.</param>
    /// <exception cref="InvalidOperationException">
    /// Gọi khi <see cref="IsAwaitingTenantSettlementConfirmation"/> sai — lỗi lập trình.
    /// </exception>
    public void ConfirmSettlementByTenant(DateTimeOffset now, int paymentDueDays)
    {
        EnsureAllowed(IsAwaitingTenantSettlementConfirmation, nameof(ConfirmSettlementByTenant));

        TenantConfirmedAt = now;
        LockSettlement(now, paymentDueDays);
    }

    /// <summary>FR-95: Chủ trọ tự chốt kèm ghi chú bắt buộc; bảng bị khóa như khi người thuê đồng ý.</summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="CanFinalizeSettlement"/> sai — lỗi lập trình.</exception>
    public void FinalizeSettlementByLandlord(string note, DateTimeOffset now, int paymentDueDays)
    {
        EnsureAllowed(CanFinalizeSettlement(now), nameof(FinalizeSettlementByLandlord));

        LandlordFinalizeNote = note;
        LockSettlement(now, paymentDueDays);
    }

    /// <summary>
    /// database-design mục 6.1: số dư dương → Chưa thanh toán, phát hành lúc khóa, hạn thanh toán tính từ ngày khóa theo
    /// giờ Việt Nam (BP-10 bước 6); số dư âm → Chờ hoàn cọc; bằng 0 → Đã thanh toán ngay.
    /// </summary>
    private void LockSettlement(DateTimeOffset now, int paymentDueDays)
    {
        if (TotalAmount > 0)
        {
            Status = InvoiceStatus.ChuaThanhToan;
            IssuedAt = now;
            DueDate = VietnamTime.DateOf(now).AddDays(paymentDueDays);
        }
        else if (TotalAmount < 0)
        {
            Status = InvoiceStatus.ChoHoanCoc;
        }
        else
        {
            Status = InvoiceStatus.DaThanhToan;
            SettledAt = now;
        }
    }

    /// <summary>
    /// Service phải kiểm tra điều kiện và trả 409 trước khi đổi trạng thái; tới được đây mà điều kiện sai là lỗi lập
    /// trình, không phải lỗi nghiệp vụ.
    /// </summary>
    private void EnsureAllowed(bool allowed, string operation)
    {
        if (!allowed)
        {
            throw new InvalidOperationException($"Hóa đơn {Id} ở trạng thái {Status}: không thực hiện được {operation}.");
        }
    }
}
