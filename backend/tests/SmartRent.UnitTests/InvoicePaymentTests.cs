using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

/// <summary>
/// Luồng thanh toán — BP-07, FR-45 tới FR-48, api-design mục 9 "Luồng thanh toán", tài liệu phân tích mục 8.5: người thuê
/// báo đã trả kèm minh chứng, Chủ trọ xác nhận số tiền thực thu hoặc từ chối. Hóa đơn kỳ 01/11 – 30/11/2026, tổng
/// 2.350.000, phát hành 9 giờ sáng 26/11, hạn 01/12 — quá hạn từ 0 giờ ngày 02/12 giờ Việt Nam (architecture mục 7.1).
/// </summary>
public class InvoicePaymentTests
{
    private const int PaymentDueDays = 5;

    private const long LandlordUserId = 24;

    private const string ProofPath = "private-documents/MinhChungThanhToan/28/2026/11/0123456789abcdef0123456789abcdef.jpg";

    private static DateOnly D(int year, int month, int day) => new(year, month, day);

    /// <summary>Một thời điểm theo giờ Việt Nam.</summary>
    private static DateTimeOffset Vn(int year, int month, int day, int hour, int minute = 0)
        => new(year, month, day, hour, minute, 0, TimeSpan.FromHours(7));

    /// <summary>Trước hạn: 30/11.</summary>
    private static readonly DateTimeOffset BeforeDue = Vn(2026, 11, 30, 20);

    /// <summary>Quá hạn: 02/12, ngày sau hạn 01/12.</summary>
    private static readonly DateTimeOffset AfterDue = Vn(2026, 12, 2, 8);

    /// <summary>Hóa đơn đã phát hành lúc 9 giờ sáng 26/11, hạn 01/12.</summary>
    private static Invoice Issued(decimal total = 2_350_000)
    {
        var invoice = new Invoice
        {
            Id = 128,
            ContractId = 4,
            Type = InvoiceType.DinhKy,
            PeriodStart = D(2026, 11, 1),
            PeriodEnd = D(2026, 11, 30),
            TotalAmount = total,
            Status = InvoiceStatus.Nhap
        };

        invoice.Issue(Vn(2026, 11, 26, 9), PaymentDueDays);

        return invoice;
    }

    /// <summary>Hóa đơn đã thu 1.000.000 trước hạn, còn phải trả 1.350.000.</summary>
    private static Invoice PartlyPaid()
    {
        var invoice = Issued();
        var report = invoice.ReportPayment(1_000_000, ProofPath, Vn(2026, 11, 27, 10));
        invoice.ConfirmPayment(report, 1_000_000, LandlordUserId, Vn(2026, 11, 27, 18));
        return invoice;
    }

    // ---------------------------------------------------------------- Báo đã thanh toán

    /// <summary>FR-45: chỉ báo được khi hóa đơn chờ trả tiền — Chưa thanh toán, Thanh toán một phần, Quá hạn.</summary>
    [Theory]
    [InlineData(InvoiceStatus.Nhap, false)]
    [InlineData(InvoiceStatus.ChuaThanhToan, true)]
    [InlineData(InvoiceStatus.ChoXacNhan, false)]
    [InlineData(InvoiceStatus.ThanhToanMotPhan, true)]
    [InlineData(InvoiceStatus.QuaHan, true)]
    [InlineData(InvoiceStatus.DaThanhToan, false)]
    [InlineData(InvoiceStatus.DaHuy, false)]
    [InlineData(InvoiceStatus.DaChuyenThanhLy, false)]
    [InlineData(InvoiceStatus.ChoNguoiThueXacNhan, false)]
    [InlineData(InvoiceStatus.ChoHoanCoc, false)]
    public void CanReportPayment_TheoTrangThai(InvoiceStatus status, bool expected)
    {
        var invoice = Issued();
        invoice.Status = status;

        Assert.Equal(expected, invoice.CanReportPayment);
    }

    /// <summary>Số tiền báo hoặc xác nhận lớn hơn 0 và không vượt phần còn phải trả 2.350.000.</summary>
    [Theory]
    [InlineData(-1, false)]
    [InlineData(0, false)]
    [InlineData(1, true)]
    [InlineData(2_350_000, true)]
    [InlineData(2_350_001, false)]
    public void IsValidPaymentAmount_TrongPhanConPhaiTra(int amount, bool expected)
    {
        Assert.Equal(expected, Issued().IsValidPaymentAmount(amount));
    }

    /// <summary>Đã thu 1.000.000 thì trần là phần còn lại 1.350.000, không phải tổng hóa đơn.</summary>
    [Theory]
    [InlineData(1_350_000, true)]
    [InlineData(1_350_001, false)]
    [InlineData(2_350_000, false)]
    public void IsValidPaymentAmount_DaThuMotPhan_TranLaPhanConLai(int amount, bool expected)
    {
        Assert.Equal(expected, PartlyPaid().IsValidPaymentAmount(amount));
    }

    /// <summary>FR-45: hóa đơn sang Chờ xác nhận; lượt báo ghi số tiền, minh chứng và thời điểm, chưa có kết quả.</summary>
    [Fact]
    public void ReportPayment_ChuaThanhToan_ChoXacNhan_TaoLuotBao()
    {
        var invoice = Issued();

        var report = invoice.ReportPayment(2_350_000, ProofPath, Vn(2026, 11, 28, 10));

        Assert.Equal(InvoiceStatus.ChoXacNhan, invoice.Status);
        Assert.Same(report, Assert.Single(invoice.PaymentReports));
        Assert.Equal(128, report.InvoiceId);
        Assert.Equal(2_350_000, report.ReportedAmount);
        Assert.Equal(ProofPath, report.ProofImageUrl);
        Assert.Equal(Vn(2026, 11, 28, 10), report.ReportedAt);
        Assert.Equal(PaymentReportStatus.ChoXacNhan, report.Status);
        Assert.Null(report.ConfirmedAmount);
        Assert.Null(report.ConfirmedAt);
        Assert.Null(report.ConfirmedByUserId);
        Assert.Equal(0, invoice.PaidAmount);
    }

    /// <summary>Báo khi đã quá hạn vẫn nhận; hạn thanh toán giữ nguyên.</summary>
    [Fact]
    public void ReportPayment_QuaHan_ChoXacNhan_GiuHan()
    {
        var invoice = Issued();
        invoice.Status = InvoiceStatus.QuaHan;

        invoice.ReportPayment(2_350_000, ProofPath, AfterDue);

        Assert.Equal(InvoiceStatus.ChoXacNhan, invoice.Status);
        Assert.Equal(D(2026, 12, 1), invoice.DueDate);
    }

    /// <summary>Đang chờ xác nhận thì không có mã VietQR, không sửa, hủy hay kết chuyển vào thanh lý được.</summary>
    [Fact]
    public void ReportPayment_ChoXacNhan_KhongQrKhongSuaKhongKetChuyen()
    {
        var invoice = Issued();

        invoice.ReportPayment(2_350_000, ProofPath, BeforeDue);

        Assert.False(invoice.IsAwaitingPayment);
        Assert.False(invoice.CanBeEditedOrCancelled);
        Assert.False(invoice.CanCarryOverToSettlement);
        Assert.False(invoice.CanReportPayment);
    }

    [Fact]
    public void ReportPayment_DangChoXacNhan_NemLoiVaGiuNguyen()
    {
        var invoice = Issued();
        invoice.ReportPayment(1_000_000, ProofPath, BeforeDue);

        Assert.Throws<InvalidOperationException>(() => invoice.ReportPayment(1_000_000, ProofPath, BeforeDue));
        Assert.Single(invoice.PaymentReports);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(2_350_001)]
    public void ReportPayment_SoTienSai_NemLoiVaGiuNguyen(int amount)
    {
        var invoice = Issued();

        Assert.Throws<InvalidOperationException>(() => invoice.ReportPayment(amount, ProofPath, BeforeDue));
        Assert.Equal(InvoiceStatus.ChuaThanhToan, invoice.Status);
        Assert.Empty(invoice.PaymentReports);
    }

    // ---------------------------------------------------------------- Xác nhận

    /// <summary>Trả đủ trước hạn: Đã thanh toán, ghi thời điểm tất toán; lượt báo ghi người, lúc và số tiền xác nhận.</summary>
    [Fact]
    public void ConfirmPayment_TraDu_DaThanhToan()
    {
        var invoice = Issued();
        var report = invoice.ReportPayment(2_350_000, ProofPath, Vn(2026, 11, 28, 10));

        invoice.ConfirmPayment(report, 2_350_000, LandlordUserId, Vn(2026, 11, 28, 19));

        Assert.Equal(InvoiceStatus.DaThanhToan, invoice.Status);
        Assert.Equal(2_350_000, invoice.PaidAmount);
        Assert.Equal(0, invoice.RemainingAmount);
        Assert.Equal(Vn(2026, 11, 28, 19), invoice.SettledAt);
        Assert.Equal(PaymentReportStatus.DaXacNhan, report.Status);
        Assert.Equal(2_350_000, report.ConfirmedAmount);
        Assert.Equal(Vn(2026, 11, 28, 19), report.ConfirmedAt);
        Assert.Equal(LandlordUserId, report.ConfirmedByUserId);
        Assert.Null(report.RejectReason);
    }

    /// <summary>Trả đủ sau hạn vẫn là Đã thanh toán.</summary>
    [Fact]
    public void ConfirmPayment_TraDuSauHan_DaThanhToan()
    {
        var invoice = Issued();
        var report = invoice.ReportPayment(2_350_000, ProofPath, AfterDue);

        invoice.ConfirmPayment(report, 2_350_000, LandlordUserId, AfterDue);

        Assert.Equal(InvoiceStatus.DaThanhToan, invoice.Status);
        Assert.Equal(AfterDue, invoice.SettledAt);
    }

    /// <summary>FR-47: trả một phần trước hạn — Thanh toán một phần, phần còn lại 1.350.000 vẫn là công nợ.</summary>
    [Fact]
    public void ConfirmPayment_TraMotPhanTruocHan_ThanhToanMotPhan()
    {
        var invoice = Issued();
        var report = invoice.ReportPayment(1_000_000, ProofPath, BeforeDue);

        invoice.ConfirmPayment(report, 1_000_000, LandlordUserId, BeforeDue);

        Assert.Equal(InvoiceStatus.ThanhToanMotPhan, invoice.Status);
        Assert.Equal(1_000_000, invoice.PaidAmount);
        Assert.Equal(1_350_000, invoice.RemainingAmount);
        Assert.Null(invoice.SettledAt);
        Assert.True(invoice.IsAwaitingPayment);
    }

    /// <summary>FR-47: trả một phần sau hạn — Quá hạn, số đã trả vẫn được ghi nhận.</summary>
    [Fact]
    public void ConfirmPayment_TraMotPhanSauHan_QuaHan()
    {
        var invoice = Issued();
        var report = invoice.ReportPayment(1_000_000, ProofPath, BeforeDue);

        invoice.ConfirmPayment(report, 1_000_000, LandlordUserId, AfterDue);

        Assert.Equal(InvoiceStatus.QuaHan, invoice.Status);
        Assert.Equal(1_000_000, invoice.PaidAmount);
    }

    /// <summary>
    /// Ranh giới theo giờ Việt Nam: 23 giờ 59 ngày 01/12 vẫn trong hạn; 00 giờ 30 ngày 02/12 giờ Việt Nam — tức 17 giờ 30
    /// ngày 01/12 UTC — đã quá hạn.
    /// </summary>
    [Theory]
    [InlineData(16, 59, InvoiceStatus.ThanhToanMotPhan)]
    [InlineData(17, 30, InvoiceStatus.QuaHan)]
    public void ConfirmPayment_TraMotPhan_QuaHanTinhTheoNgayVietNam(int utcHour, int utcMinute, InvoiceStatus expected)
    {
        var invoice = Issued();
        var report = invoice.ReportPayment(1_000_000, ProofPath, BeforeDue);

        invoice.ConfirmPayment(
            report, 1_000_000, LandlordUserId, new DateTimeOffset(2026, 12, 1, utcHour, utcMinute, 0, TimeSpan.Zero));

        Assert.Equal(expected, invoice.Status);
    }

    /// <summary>Chủ trọ xác nhận số thực thu khác số người thuê khai: hóa đơn theo số Chủ trọ xác nhận.</summary>
    [Fact]
    public void ConfirmPayment_ThucThuItHonSoBao_TheoSoXacNhan()
    {
        var invoice = Issued();
        var report = invoice.ReportPayment(2_350_000, ProofPath, BeforeDue);

        invoice.ConfirmPayment(report, 2_000_000, LandlordUserId, BeforeDue);

        Assert.Equal(InvoiceStatus.ThanhToanMotPhan, invoice.Status);
        Assert.Equal(2_000_000, invoice.PaidAmount);
        Assert.Equal(2_350_000, report.ReportedAmount);
        Assert.Equal(2_000_000, report.ConfirmedAmount);
    }

    /// <summary>Trả làm hai lần: 1.000.000 rồi 1.350.000 — lần sau cộng dồn, đủ tổng thì Đã thanh toán.</summary>
    [Fact]
    public void ConfirmPayment_TraLanHaiDuPhanConLai_DaThanhToan()
    {
        var invoice = PartlyPaid();
        var second = invoice.ReportPayment(1_350_000, ProofPath, Vn(2026, 11, 30, 9));

        invoice.ConfirmPayment(second, 1_350_000, LandlordUserId, Vn(2026, 11, 30, 21));

        Assert.Equal(InvoiceStatus.DaThanhToan, invoice.Status);
        Assert.Equal(2_350_000, invoice.PaidAmount);
        Assert.Equal(2, invoice.PaymentReports.Count);
        Assert.All(invoice.PaymentReports, p => Assert.Equal(PaymentReportStatus.DaXacNhan, p.Status));
    }

    /// <summary>Đã thu một phần thì hóa đơn không sửa, không hủy được nữa, nhưng vẫn kết chuyển vào thanh lý được.</summary>
    [Fact]
    public void ConfirmPayment_TraMotPhan_KhongSuaHuyDuoc_VanKetChuyenDuoc()
    {
        var invoice = PartlyPaid();

        Assert.False(invoice.CanBeEditedOrCancelled);
        Assert.True(invoice.CanCarryOverToSettlement);
    }

    [Fact]
    public void ConfirmPayment_VuotPhanConPhaiTra_NemLoiVaGiuNguyen()
    {
        var invoice = PartlyPaid();
        var report = invoice.ReportPayment(1_350_000, ProofPath, BeforeDue);

        Assert.Throws<InvalidOperationException>(
            () => invoice.ConfirmPayment(report, 1_350_001, LandlordUserId, BeforeDue));
        Assert.Equal(InvoiceStatus.ChoXacNhan, invoice.Status);
        Assert.Equal(1_000_000, invoice.PaidAmount);
        Assert.Equal(PaymentReportStatus.ChoXacNhan, report.Status);
    }

    /// <summary>Lượt báo đã xử lý thì không xác nhận lại được.</summary>
    [Fact]
    public void ConfirmPayment_LuotBaoDaXuLy_NemLoi()
    {
        var invoice = PartlyPaid();
        var processed = Assert.Single(invoice.PaymentReports);

        Assert.False(invoice.CanProcessPaymentReport(processed));
        Assert.Throws<InvalidOperationException>(
            () => invoice.ConfirmPayment(processed, 1_000_000, LandlordUserId, BeforeDue));
        Assert.Equal(1_000_000, invoice.PaidAmount);
    }

    /// <summary>Lượt báo của hóa đơn khác thì không xử lý trên hóa đơn này.</summary>
    [Fact]
    public void CanProcessPaymentReport_LuotBaoCuaHoaDonKhac_Sai()
    {
        var invoice = Issued();
        invoice.ReportPayment(2_350_000, ProofPath, BeforeDue);
        var other = Issued();
        var otherReport = other.ReportPayment(2_350_000, ProofPath, BeforeDue);

        Assert.False(invoice.CanProcessPaymentReport(otherReport));
    }

    // ---------------------------------------------------------------- Từ chối

    /// <summary>FR-48: chưa thu đồng nào, chưa quá hạn — về Chưa thanh toán; lượt báo ghi lý do, không có số xác nhận.</summary>
    [Fact]
    public void RejectPayment_ChuaThuChuaQuaHan_ChuaThanhToan()
    {
        var invoice = Issued();
        var report = invoice.ReportPayment(2_350_000, ProofPath, BeforeDue);

        invoice.RejectPayment(report, "Chưa nhận được tiền trong tài khoản", BeforeDue);

        Assert.Equal(InvoiceStatus.ChuaThanhToan, invoice.Status);
        Assert.Equal(0, invoice.PaidAmount);
        Assert.Equal(PaymentReportStatus.TuChoiXacNhan, report.Status);
        Assert.Equal("Chưa nhận được tiền trong tài khoản", report.RejectReason);
        Assert.Null(report.ConfirmedAmount);
        Assert.Null(invoice.SettledAt);
        Assert.True(invoice.IsAwaitingPayment);
        Assert.True(invoice.CanBeEditedOrCancelled);
    }

    /// <summary>FR-48: đã thu một phần, chưa quá hạn — về Thanh toán một phần, số đã thu giữ nguyên.</summary>
    [Fact]
    public void RejectPayment_DaThuMotPhanChuaQuaHan_ThanhToanMotPhan()
    {
        var invoice = PartlyPaid();
        var report = invoice.ReportPayment(1_350_000, ProofPath, BeforeDue);

        invoice.RejectPayment(report, "Ảnh minh chứng không đọc được", BeforeDue);

        Assert.Equal(InvoiceStatus.ThanhToanMotPhan, invoice.Status);
        Assert.Equal(1_000_000, invoice.PaidAmount);
    }

    /// <summary>FR-48: đã quá hạn thì về Quá hạn, dù chưa thu hay đã thu một phần.</summary>
    [Fact]
    public void RejectPayment_ChuaThuSauHan_QuaHan()
    {
        var invoice = Issued();
        var report = invoice.ReportPayment(2_350_000, ProofPath, BeforeDue);

        invoice.RejectPayment(report, "Chưa nhận được tiền", AfterDue);

        Assert.Equal(InvoiceStatus.QuaHan, invoice.Status);
        Assert.Equal(0, invoice.PaidAmount);
    }

    [Fact]
    public void RejectPayment_DaThuMotPhanSauHan_QuaHan()
    {
        var invoice = PartlyPaid();
        var report = invoice.ReportPayment(1_350_000, ProofPath, BeforeDue);

        invoice.RejectPayment(report, "Chưa nhận được tiền", AfterDue);

        Assert.Equal(InvoiceStatus.QuaHan, invoice.Status);
        Assert.Equal(1_000_000, invoice.PaidAmount);
    }

    /// <summary>Bị từ chối thì báo lại được; lượt bị từ chối vẫn giữ trong lịch sử.</summary>
    [Fact]
    public void RejectPayment_BaoLaiDuoc_GiuLichSu()
    {
        var invoice = Issued();
        var rejected = invoice.ReportPayment(2_350_000, ProofPath, BeforeDue);
        invoice.RejectPayment(rejected, "Sai số tiền", BeforeDue);

        var again = invoice.ReportPayment(2_350_000, ProofPath, BeforeDue);
        invoice.ConfirmPayment(again, 2_350_000, LandlordUserId, BeforeDue);

        Assert.Equal(InvoiceStatus.DaThanhToan, invoice.Status);
        Assert.Equal(2, invoice.PaymentReports.Count);
        Assert.Equal(PaymentReportStatus.TuChoiXacNhan, rejected.Status);
    }

    [Fact]
    public void RejectPayment_LuotBaoDaXuLy_NemLoiVaGiuNguyen()
    {
        var invoice = Issued();
        var report = invoice.ReportPayment(2_350_000, ProofPath, BeforeDue);
        invoice.RejectPayment(report, "Sai số tiền", BeforeDue);

        Assert.Throws<InvalidOperationException>(() => invoice.RejectPayment(report, "Lần hai", BeforeDue));
        Assert.Equal("Sai số tiền", report.RejectReason);
        Assert.Equal(InvoiceStatus.ChuaThanhToan, invoice.Status);
    }

    // ---------------------------------------------------------------- Hóa đơn thanh lý

    /// <summary>
    /// FR-96: hóa đơn thanh lý số dư dương 800.000 đã khóa (người thuê đồng ý 20/11, hạn 25/11) vẫn đi luồng thanh toán:
    /// trả một phần sau hạn thành Quá hạn, trả nốt thành Đã thanh toán — đã tất toán xong.
    /// </summary>
    [Fact]
    public void HoaDonThanhLySoDuDuong_DiLuongThanhToan()
    {
        var invoice = new Invoice
        {
            Id = 140,
            ContractId = 4,
            Type = InvoiceType.ThanhLy,
            PeriodStart = D(2026, 11, 1),
            PeriodEnd = D(2026, 11, 15),
            TotalAmount = 800_000,
            Status = InvoiceStatus.Nhap
        };
        invoice.SendSettlement(Vn(2026, 11, 16, 9));
        invoice.ConfirmSettlementByTenant(Vn(2026, 11, 20, 9), PaymentDueDays);

        var first = invoice.ReportPayment(300_000, ProofPath, Vn(2026, 11, 24, 9));
        invoice.ConfirmPayment(first, 300_000, LandlordUserId, Vn(2026, 11, 26, 9));

        Assert.Equal(InvoiceStatus.QuaHan, invoice.Status);
        Assert.True(invoice.IsSettlementLocked);

        var second = invoice.ReportPayment(500_000, ProofPath, Vn(2026, 11, 27, 9));
        invoice.ConfirmPayment(second, 500_000, LandlordUserId, Vn(2026, 11, 27, 18));

        Assert.Equal(InvoiceStatus.DaThanhToan, invoice.Status);
        Assert.Equal(800_000, invoice.PaidAmount);
        Assert.Equal(Vn(2026, 11, 27, 18), invoice.SettledAt);
    }
}
