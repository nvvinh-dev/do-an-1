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
    /// FR-49, FR-52: hóa đơn định kỳ ở các trạng thái này mà chưa thu đồng nào thì Chủ trọ sửa hoặc hủy được — điều kiện
    /// "mới nhất của hợp đồng" kiểm tra riêng bằng <see cref="Contract.LatestPeriodicInvoice"/>.
    /// </summary>
    public static readonly InvoiceStatus[] EditableStatuses =
        [InvoiceStatus.Nhap, InvoiceStatus.ChuaThanhToan, InvoiceStatus.QuaHan];

    /// <summary>Mục 9.1: hóa đơn chờ người thuê trả tiền — hiện mã VietQR khi còn phải trả lớn hơn 0.</summary>
    public static readonly InvoiceStatus[] AwaitingPaymentStatuses =
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

    /// <summary>Phần còn phải trả: tổng tiền trừ số đã được Chủ trọ xác nhận thu.</summary>
    public decimal RemainingAmount => TotalAmount - PaidAmount;

    /// <summary>Mục 9.1, FR-78: người thuê đứng tên thấy mã VietQR với số tiền bằng <see cref="RemainingAmount"/>.</summary>
    public bool IsAwaitingPayment => AwaitingPaymentStatuses.Contains(Status) && RemainingAmount > 0;

    /// <summary>
    /// api-design mục 9: người thuê thấy hóa đơn định kỳ từ khi phát hành, hóa đơn thanh lý từ khi được gửi. Hóa đơn ở
    /// Nháp, và hóa đơn định kỳ bị hủy khi còn Nháp — chưa từng phát hành — người thuê không thấy.
    /// </summary>
    public bool IsVisibleToTenant
        => Status != InvoiceStatus.Nhap && (Status != InvoiceStatus.DaHuy || IssuedAt is not null);

    /// <summary>Chỉ hóa đơn định kỳ ở Nháp mới phát hành; bảng thanh lý gửi cho người thuê theo BP-10.</summary>
    public bool CanIssue => Type == InvoiceType.DinhKy && Status == InvoiceStatus.Nhap;

    /// <summary>
    /// FR-49, FR-52: hóa đơn định kỳ chưa thu đồng nào, ở Nháp, Chưa thanh toán hoặc Quá hạn. Service kiểm tra thêm hóa
    /// đơn là hóa đơn định kỳ mới nhất của hợp đồng — sửa hóa đơn cũ hơn làm gãy chuỗi chỉ số (BR-14, BR-16).
    /// </summary>
    public bool CanBeEditedOrCancelled
        => Type == InvoiceType.DinhKy && EditableStatuses.Contains(Status) && PaidAmount == 0;

    /// <summary>
    /// api-design mục 9: Nháp → Chưa thanh toán, hạn thanh toán là ngày phát hành theo giờ Việt Nam cộng số ngày ghi
    /// trong hợp đồng. Tổng bằng 0 thì không còn gì phải trả, hóa đơn sang Đã thanh toán ngay (FR-41).
    /// </summary>
    /// <param name="paymentDueDays">Số ngày được phép thanh toán ghi trong hợp đồng.</param>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="CanIssue"/> sai — lỗi lập trình.</exception>
    public void Issue(DateTimeOffset now, int paymentDueDays)
    {
        EnsureAllowed(CanIssue, nameof(Issue));

        IssuedAt = now;
        StartPaymentPeriod(now, paymentDueDays);
    }

    /// <summary>
    /// FR-50: Chủ trọ vừa sửa số tiền của hóa đơn. Hóa đơn đã phát hành có lại trọn hạn thanh toán tính từ ngày sửa —
    /// Quá hạn về Chưa thanh toán — hoặc sang Đã thanh toán nếu tổng mới bằng 0; ngày phát hành giữ lần đầu. Hóa đơn
    /// Nháp chưa có hạn nên giữ nguyên.
    /// </summary>
    /// <param name="paymentDueDays">Số ngày được phép thanh toán ghi trong hợp đồng.</param>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="CanBeEditedOrCancelled"/> sai — lỗi lập trình.</exception>
    public void ResetPaymentAfterEdit(DateTimeOffset now, int paymentDueDays)
    {
        EnsureAllowed(CanBeEditedOrCancelled, nameof(ResetPaymentAfterEdit));

        if (Status != InvoiceStatus.Nhap)
        {
            StartPaymentPeriod(now, paymentDueDays);
        }
    }

    /// <summary>FR-52: hóa đơn sang Đã hủy kèm lý do bắt buộc.</summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="CanBeEditedOrCancelled"/> sai — lỗi lập trình.</exception>
    public void Cancel(string reason)
    {
        EnsureAllowed(CanBeEditedOrCancelled, nameof(Cancel));

        Status = InvoiceStatus.DaHuy;
        CancelReason = reason;
    }

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
    /// Bảng thanh lý đã khóa — người thuê đồng ý hoặc Chủ trọ tự chốt — nên Chủ trọ hoàn tất thanh lý được. Số dư dương
    /// chưa trả đủ, kể cả đang chờ xác nhận lượt báo thanh toán, vẫn là đã khóa (FR-96).
    /// </summary>
    public bool IsSettlementLocked
        => Type == InvoiceType.ThanhLy && Status is not (InvoiceStatus.Nhap or InvoiceStatus.ChoNguoiThueXacNhan);

    /// <summary>
    /// database-design mục 6.1: hóa đơn thanh lý số dư âm sang Đã thanh toán khi Chủ trọ ghi nhận hoàn cọc lúc hoàn tất
    /// thanh lý — với hóa đơn thanh lý, Đã thanh toán nghĩa là đã tất toán xong.
    /// </summary>
    /// <exception cref="InvalidOperationException">Gọi khi hóa đơn không ở Chờ hoàn cọc — lỗi lập trình.</exception>
    public void CompleteDepositRefund(DateTimeOffset now)
    {
        EnsureAllowed(Status == InvoiceStatus.ChoHoanCoc, nameof(CompleteDepositRefund));

        Status = InvoiceStatus.DaThanhToan;
        SettledAt = now;
    }

    /// <summary>
    /// FR-86, api-design mục 10: thời điểm hoàn cọc khi thanh lý do Chủ trọ nhập, từ 0 giờ ngày trả phòng thực tế (giờ
    /// Việt Nam) — ngày cuối kỳ của hóa đơn thanh lý (FR-93) — tới hiện tại. Kiểm phòng xong mới biết trừ bao nhiêu nên
    /// không hoàn trước ngày trả phòng; không so với lúc gửi thông báo, vì thông báo có thể được ghi sau khi người thuê đã
    /// dọn đi và nhận lại cọc. Sai thì service trả 422.
    /// </summary>
    public bool IsValidSettlementRefundTime(DateTimeOffset refundedAt, DateTimeOffset now)
        => refundedAt >= VietnamTime.StartOf(PeriodEnd) && refundedAt <= now;

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
    /// Hóa đơn định kỳ vừa phát hành hoặc vừa sửa sau khi phát hành: còn phải trả thì Chưa thanh toán với hạn tính từ
    /// hôm nay (giờ Việt Nam); tổng bằng 0 thì Đã thanh toán ngay và không có hạn, như hóa đơn thanh lý số dư 0.
    /// </summary>
    private void StartPaymentPeriod(DateTimeOffset now, int paymentDueDays)
    {
        if (TotalAmount == 0)
        {
            Status = InvoiceStatus.DaThanhToan;
            SettledAt = now;
            DueDate = null;
        }
        else
        {
            Status = InvoiceStatus.ChuaThanhToan;
            DueDate = VietnamTime.DateOf(now).AddDays(paymentDueDays);
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
