using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

/// <summary>
/// Vòng đời hóa đơn định kỳ — BP-07, FR-41, FR-49, FR-50, FR-52, tài liệu phân tích mục 8.5: phát hành, sửa, hủy,
/// hóa đơn người thuê được thấy và mã VietQR (mục 9.1). Hóa đơn kỳ 01/11 – 30/11/2026, tổng 2.350.000; hợp đồng cho 5
/// ngày thanh toán kể từ khi phát hành.
/// </summary>
public class InvoicePeriodicLifecycleTests
{
    private const int PaymentDueDays = 5;

    private static DateOnly D(int year, int month, int day) => new(year, month, day);

    /// <summary>Một thời điểm theo giờ Việt Nam.</summary>
    private static DateTimeOffset Vn(int year, int month, int day, int hour, int minute = 0)
        => new(year, month, day, hour, minute, 0, TimeSpan.FromHours(7));

    private static Invoice Periodic(InvoiceStatus status = InvoiceStatus.Nhap, decimal total = 2_350_000) => new()
    {
        Id = 128,
        ContractId = 4,
        Type = InvoiceType.DinhKy,
        PeriodStart = D(2026, 11, 1),
        PeriodEnd = D(2026, 11, 30),
        TotalAmount = total,
        Status = status
    };

    /// <summary>Hóa đơn đã phát hành lúc 9 giờ sáng 26/11, hạn 01/12.</summary>
    private static Invoice Issued(decimal total = 2_350_000)
    {
        var invoice = Periodic(total: total);
        invoice.Issue(Vn(2026, 11, 26, 9), PaymentDueDays);
        return invoice;
    }

    // ---------------------------------------------------------------- Phát hành

    /// <summary>api-design mục 9: Nháp → Chưa thanh toán, hạn = ngày phát hành (giờ Việt Nam) + 5 ngày.</summary>
    [Fact]
    public void Issue_Nhap_ChuaThanhToan_HanTinhTuNgayPhatHanh()
    {
        var invoice = Periodic();

        invoice.Issue(Vn(2026, 11, 26, 9), PaymentDueDays);

        Assert.Equal(InvoiceStatus.ChuaThanhToan, invoice.Status);
        Assert.Equal(Vn(2026, 11, 26, 9), invoice.IssuedAt);
        Assert.Equal(D(2026, 12, 1), invoice.DueDate);
        Assert.Null(invoice.SettledAt);
    }

    /// <summary>
    /// Ngày phát hành theo giờ Việt Nam: 01 giờ 30 sáng 27/11 giờ Việt Nam là 18 giờ 30 ngày 26/11 UTC, hạn vẫn là
    /// 27/11 + 5 = 02/12.
    /// </summary>
    [Fact]
    public void Issue_SauNuaDemGioVietNam_HanTinhTheoNgayVietNam()
    {
        var invoice = Periodic();

        invoice.Issue(new DateTimeOffset(2026, 11, 26, 18, 30, 0, TimeSpan.Zero), PaymentDueDays);

        Assert.Equal(D(2026, 12, 2), invoice.DueDate);
    }

    /// <summary>FR-41: tổng bằng 0 — dòng điều chỉnh bù hết tiền tháng — thì sang Đã thanh toán ngay, không có hạn.</summary>
    [Fact]
    public void Issue_TongBang0_DaThanhToanNgay_KhongCoHan()
    {
        var invoice = Periodic(total: 0);

        invoice.Issue(Vn(2026, 11, 26, 9), PaymentDueDays);

        Assert.Equal(InvoiceStatus.DaThanhToan, invoice.Status);
        Assert.Equal(Vn(2026, 11, 26, 9), invoice.IssuedAt);
        Assert.Equal(Vn(2026, 11, 26, 9), invoice.SettledAt);
        Assert.Null(invoice.DueDate);
    }

    /// <summary>Chỉ hóa đơn định kỳ ở Nháp mới phát hành được; bảng thanh lý gửi cho người thuê theo BP-10.</summary>
    [Theory]
    [InlineData(InvoiceType.DinhKy, InvoiceStatus.Nhap, true)]
    [InlineData(InvoiceType.DinhKy, InvoiceStatus.ChuaThanhToan, false)]
    [InlineData(InvoiceType.DinhKy, InvoiceStatus.DaHuy, false)]
    [InlineData(InvoiceType.ThanhLy, InvoiceStatus.Nhap, false)]
    public void CanIssue_ChiHoaDonDinhKyONhap(InvoiceType type, InvoiceStatus status, bool expected)
    {
        var invoice = Periodic(status);
        invoice.Type = type;

        Assert.Equal(expected, invoice.CanIssue);
    }

    [Fact]
    public void Issue_DaPhatHanh_NemLoiVaGiuNguyen()
    {
        var invoice = Issued();

        Assert.Throws<InvalidOperationException>(() => invoice.Issue(Vn(2026, 11, 28, 9), PaymentDueDays));
        Assert.Equal(D(2026, 12, 1), invoice.DueDate);
    }

    // ---------------------------------------------------------------- Được sửa, hủy

    /// <summary>
    /// FR-49, FR-52: sửa và hủy được khi hóa đơn định kỳ ở Nháp, Chưa thanh toán hoặc Quá hạn mà chưa thu đồng nào.
    /// Đã thu một phần, đang chờ xác nhận, đã thanh toán, đã hủy, đã chuyển thanh lý thì không.
    /// </summary>
    [Theory]
    [InlineData(InvoiceStatus.Nhap, 0, true)]
    [InlineData(InvoiceStatus.ChuaThanhToan, 0, true)]
    [InlineData(InvoiceStatus.QuaHan, 0, true)]
    [InlineData(InvoiceStatus.QuaHan, 500_000, false)]
    [InlineData(InvoiceStatus.ThanhToanMotPhan, 500_000, false)]
    [InlineData(InvoiceStatus.ChoXacNhan, 0, false)]
    [InlineData(InvoiceStatus.DaThanhToan, 2_350_000, false)]
    [InlineData(InvoiceStatus.DaHuy, 0, false)]
    [InlineData(InvoiceStatus.DaChuyenThanhLy, 0, false)]
    public void CanBeEditedOrCancelled_ChuaThuDongNao(InvoiceStatus status, int paid, bool expected)
    {
        var invoice = Periodic(status);
        invoice.PaidAmount = paid;

        Assert.Equal(expected, invoice.CanBeEditedOrCancelled);
    }

    /// <summary>Hóa đơn thanh lý sửa theo BP-10 và không có bước hủy.</summary>
    [Fact]
    public void CanBeEditedOrCancelled_HoaDonThanhLy_Sai()
    {
        var invoice = Periodic();
        invoice.Type = InvoiceType.ThanhLy;

        Assert.False(invoice.CanBeEditedOrCancelled);
    }

    // ---------------------------------------------------------------- Sau khi sửa

    /// <summary>Hóa đơn Nháp sửa xong vẫn là Nháp, chưa có hạn.</summary>
    [Fact]
    public void ResetPaymentAfterEdit_Nhap_GiuNguyenNhap()
    {
        var invoice = Periodic();

        invoice.ResetPaymentAfterEdit(Vn(2026, 11, 27, 9), PaymentDueDays);

        Assert.Equal(InvoiceStatus.Nhap, invoice.Status);
        Assert.Null(invoice.DueDate);
        Assert.Null(invoice.IssuedAt);
    }

    /// <summary>
    /// FR-50: hóa đơn quá hạn (hạn 01/12) sửa ngày 05/12 → Chưa thanh toán, hạn mới 05/12 + 5 = 10/12; ngày phát hành
    /// giữ lần đầu.
    /// </summary>
    [Fact]
    public void ResetPaymentAfterEdit_QuaHan_ChuaThanhToan_HanTinhLaiTuNgaySua()
    {
        var invoice = Issued();
        invoice.Status = InvoiceStatus.QuaHan;

        invoice.ResetPaymentAfterEdit(Vn(2026, 12, 5, 14), PaymentDueDays);

        Assert.Equal(InvoiceStatus.ChuaThanhToan, invoice.Status);
        Assert.Equal(D(2026, 12, 10), invoice.DueDate);
        Assert.Equal(Vn(2026, 11, 26, 9), invoice.IssuedAt);
    }

    /// <summary>FR-41: hóa đơn đã phát hành sửa thành tổng 0 → Đã thanh toán ngay, bỏ hạn thanh toán.</summary>
    [Fact]
    public void ResetPaymentAfterEdit_DaPhatHanhSuaThanhTong0_DaThanhToan()
    {
        var invoice = Issued();
        invoice.TotalAmount = 0;

        invoice.ResetPaymentAfterEdit(Vn(2026, 11, 28, 9), PaymentDueDays);

        Assert.Equal(InvoiceStatus.DaThanhToan, invoice.Status);
        Assert.Equal(Vn(2026, 11, 28, 9), invoice.SettledAt);
        Assert.Null(invoice.DueDate);
    }

    [Fact]
    public void ResetPaymentAfterEdit_DaThuMotPhan_NemLoi()
    {
        var invoice = Issued();
        invoice.Status = InvoiceStatus.ThanhToanMotPhan;
        invoice.PaidAmount = 500_000;

        Assert.Throws<InvalidOperationException>(
            () => invoice.ResetPaymentAfterEdit(Vn(2026, 11, 28, 9), PaymentDueDays));
    }

    // ---------------------------------------------------------------- Hủy

    /// <summary>FR-52: hủy ghi lý do; hóa đơn sang Đã hủy.</summary>
    [Fact]
    public void Cancel_ChuaThanhToan_DaHuy_GhiLyDo()
    {
        var invoice = Issued();

        invoice.Cancel("Ghi nhầm chỉ số điện");

        Assert.Equal(InvoiceStatus.DaHuy, invoice.Status);
        Assert.Equal("Ghi nhầm chỉ số điện", invoice.CancelReason);
    }

    [Fact]
    public void Cancel_DaThanhToan_NemLoiVaGiuNguyen()
    {
        var invoice = Issued();
        invoice.Status = InvoiceStatus.DaThanhToan;
        invoice.PaidAmount = 2_350_000;

        Assert.Throws<InvalidOperationException>(() => invoice.Cancel("Lập sai"));
        Assert.Equal(InvoiceStatus.DaThanhToan, invoice.Status);
        Assert.Null(invoice.CancelReason);
    }

    // ---------------------------------------------------------------- Người thuê được thấy

    /// <summary>
    /// api-design mục 9: người thuê thấy hóa đơn định kỳ từ khi phát hành, hóa đơn thanh lý từ khi được gửi. Hóa đơn
    /// bị hủy khi còn Nháp chưa từng phát hành nên người thuê không thấy.
    /// </summary>
    [Fact]
    public void IsVisibleToTenant_HoaDonDinhKy()
    {
        var draft = Periodic();
        var cancelledDraft = Periodic();
        cancelledDraft.Cancel("Lập nhầm kỳ");
        var issued = Issued();
        var cancelledIssued = Issued();
        cancelledIssued.Cancel("Ghi nhầm chỉ số điện");

        Assert.False(draft.IsVisibleToTenant);
        Assert.False(cancelledDraft.IsVisibleToTenant);
        Assert.True(issued.IsVisibleToTenant);
        Assert.True(cancelledIssued.IsVisibleToTenant);
    }

    /// <summary>Bảng thanh lý 01/12 – 15/12, số dư âm (Chủ trọ phải hoàn cọc), còn ở Nháp và chưa gửi.</summary>
    private static Invoice Settlement() => new()
    {
        Id = 13,
        ContractId = 4,
        Type = InvoiceType.ThanhLy,
        PeriodStart = D(2026, 12, 1),
        PeriodEnd = D(2026, 12, 15),
        TotalAmount = -500_000,
        Status = InvoiceStatus.Nhap
    };

    /// <summary>FR-103: bảng thanh lý Chủ trọ mới lập, chưa từng gửi thì người thuê không thấy.</summary>
    [Fact]
    public void IsVisibleToTenant_BangThanhLyChuaGui_Sai()
    {
        Assert.False(Settlement().IsVisibleToTenant);
    }

    /// <summary>Bảng đã gửi lúc 10 giờ sáng 16/12, đang chờ người thuê xác nhận.</summary>
    [Fact]
    public void IsVisibleToTenant_BangThanhLyDaGui_Dung()
    {
        var invoice = Settlement();
        invoice.SendSettlement(Vn(2026, 12, 16, 10));

        Assert.True(invoice.IsVisibleToTenant);
    }

    /// <summary>
    /// FR-103: người thuê yêu cầu sửa → bảng về Nháp nhưng đã từng gửi, nên người thuê vẫn xem được (chỉ đọc, kèm lý do
    /// mình vừa nhập).
    /// </summary>
    [Fact]
    public void IsVisibleToTenant_BangThanhLyDaGuiRoiVeNhap_Dung()
    {
        var invoice = Settlement();
        invoice.SendSettlement(Vn(2026, 12, 16, 10));
        invoice.RequestSettlementChanges("Chưa trừ tiền điện đã trả trước");

        Assert.Equal(InvoiceStatus.Nhap, invoice.Status);
        Assert.True(invoice.IsVisibleToTenant);
    }

    /// <summary>Bảng đã khóa sau khi người thuê đồng ý — số dư âm nên Chờ hoàn cọc — người thuê vẫn thấy.</summary>
    [Fact]
    public void IsVisibleToTenant_BangThanhLyDaKhoa_Dung()
    {
        var invoice = Settlement();
        invoice.SendSettlement(Vn(2026, 12, 16, 10));
        invoice.ConfirmSettlementByTenant(Vn(2026, 12, 17, 9), PaymentDueDays);

        Assert.Equal(InvoiceStatus.ChoHoanCoc, invoice.Status);
        Assert.True(invoice.IsVisibleToTenant);
    }

    // ---------------------------------------------------------------- Mã VietQR

    /// <summary>
    /// Mục 9.1: còn phải trả = tổng − đã thu, chỉ hiện mã khi hóa đơn ở Chưa thanh toán, Thanh toán một phần hoặc Quá
    /// hạn và còn phải trả lớn hơn 0.
    /// </summary>
    [Theory]
    [InlineData(InvoiceStatus.ChuaThanhToan, 0, true)]
    [InlineData(InvoiceStatus.ThanhToanMotPhan, 1_000_000, true)]
    [InlineData(InvoiceStatus.QuaHan, 1_000_000, true)]
    [InlineData(InvoiceStatus.ChoXacNhan, 0, false)]
    [InlineData(InvoiceStatus.Nhap, 0, false)]
    [InlineData(InvoiceStatus.DaThanhToan, 2_350_000, false)]
    public void IsAwaitingPayment_TheoTrangThai(InvoiceStatus status, int paid, bool expected)
    {
        var invoice = Periodic(status);
        invoice.PaidAmount = paid;

        Assert.Equal(expected, invoice.IsAwaitingPayment);
    }

    [Fact]
    public void RemainingAmount_TongTruDaThu()
    {
        var invoice = Issued();
        invoice.PaidAmount = 1_000_000;

        Assert.Equal(1_350_000, invoice.RemainingAmount);
    }

    /// <summary>Còn phải trả bằng 0 thì không hiện mã, dù hóa đơn đang ở Chưa thanh toán.</summary>
    [Fact]
    public void IsAwaitingPayment_KhongConPhaiTra_Sai()
    {
        var invoice = Periodic(InvoiceStatus.ChuaThanhToan, total: 0);

        Assert.False(invoice.IsAwaitingPayment);
    }
}
