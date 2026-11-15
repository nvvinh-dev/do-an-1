using System.Globalization;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

/// <summary>
/// Gắn cờ quá hạn — BP-07 A1, FR-51, FR-96, api-design mục 9 "Quá hạn": tác vụ định kỳ chuyển hóa đơn chưa trả đủ (Chưa
/// thanh toán, Thanh toán một phần) sang Quá hạn từ 0 giờ ngày sau hạn thanh toán, giờ Việt Nam (architecture mục 7.1).
/// Hóa đơn kỳ 01/11 – 30/11/2026, tổng 2.350.000, phát hành 9 giờ sáng 26/11 với 5 ngày thanh toán, hạn 01/12 — quá hạn
/// từ 0 giờ ngày 02/12 giờ Việt Nam, tức 17 giờ ngày 01/12 theo UTC.
/// </summary>
public class InvoiceOverdueTests
{
    private const int PaymentDueDays = 5;

    private const long LandlordUserId = 24;

    private const string ProofPath = "private-documents/MinhChungThanhToan/28/2026/11/0123456789abcdef0123456789abcdef.jpg";

    private static DateOnly D(int year, int month, int day) => new(year, month, day);

    /// <summary>Một thời điểm theo giờ Việt Nam.</summary>
    private static DateTimeOffset Vn(int year, int month, int day, int hour, int minute = 0, int second = 0)
        => new(year, month, day, hour, minute, second, TimeSpan.FromHours(7));

    /// <summary>Lần chạy đầu tiên của tác vụ sau hạn: 0 giờ 30 ngày 02/12.</summary>
    private static readonly DateTimeOffset FirstRunAfterDue = Vn(2026, 12, 2, 0, 30);

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

    // ---------------------------------------------------------------- Ngày biên

    /// <summary>
    /// architecture mục 7.1: quá hạn từ 0 giờ ngày sau hạn theo giờ Việt Nam. Máy chủ chạy theo UTC: từ 17 giờ đến hết
    /// ngày 01/12 UTC, lịch UTC vẫn là ngày hạn nhưng ở Việt Nam đã sang 02/12, nên đã quá hạn.
    /// </summary>
    [Theory]
    [InlineData("2026-12-01T02:00:00Z", false)] // 9 giờ sáng 01/12 giờ Việt Nam — đúng ngày hạn.
    [InlineData("2026-12-01T16:59:59Z", false)] // 23:59:59 ngày 01/12 giờ Việt Nam — giây cuối của ngày hạn.
    [InlineData("2026-12-01T17:00:00Z", true)] // 0 giờ ngày 02/12 giờ Việt Nam.
    [InlineData("2026-12-01T23:30:00Z", true)] // 6 giờ 30 sáng 02/12 giờ Việt Nam, lịch UTC còn ngày 01/12.
    public void ShouldMarkOverdue_TuKhongGioNgaySauHanTheoGioVietNam(string instantUtc, bool expected)
    {
        var invoice = Issued();
        var now = DateTimeOffset.Parse(instantUtc, CultureInfo.InvariantCulture);

        Assert.Equal(D(2026, 12, 1), invoice.DueDate);
        Assert.Equal(expected, invoice.ShouldMarkOverdue(now));
    }

    // ---------------------------------------------------------------- Trạng thái áp dụng

    /// <summary>
    /// FR-51: chỉ hóa đơn chưa trả đủ — Chưa thanh toán, Thanh toán một phần. Quá hạn rồi thì không gắn lại; Chờ xác nhận
    /// đợi Chủ trọ xử lý lượt báo — xác nhận hoặc từ chối sau hạn thì hóa đơn sang thẳng Quá hạn (FR-47, FR-48).
    /// </summary>
    [Theory]
    [InlineData(InvoiceStatus.Nhap, false)]
    [InlineData(InvoiceStatus.ChuaThanhToan, true)]
    [InlineData(InvoiceStatus.ChoXacNhan, false)]
    [InlineData(InvoiceStatus.ThanhToanMotPhan, true)]
    [InlineData(InvoiceStatus.QuaHan, false)]
    [InlineData(InvoiceStatus.DaThanhToan, false)]
    [InlineData(InvoiceStatus.DaHuy, false)]
    [InlineData(InvoiceStatus.DaChuyenThanhLy, false)]
    [InlineData(InvoiceStatus.ChoNguoiThueXacNhan, false)]
    [InlineData(InvoiceStatus.ChoHoanCoc, false)]
    public void ShouldMarkOverdue_TheoTrangThai(InvoiceStatus status, bool expected)
    {
        var invoice = Issued();
        invoice.Status = status;

        Assert.Equal(expected, invoice.ShouldMarkOverdue(FirstRunAfterDue));
    }

    /// <summary>Hóa đơn tổng 0 sang Đã thanh toán ngay khi phát hành, không có hạn nên không bao giờ quá hạn.</summary>
    [Fact]
    public void ShouldMarkOverdue_HoaDonTongBang0_KhongCoHan()
    {
        var invoice = Issued(total: 0);

        Assert.Equal(InvoiceStatus.DaThanhToan, invoice.Status);
        Assert.Null(invoice.DueDate);
        Assert.False(invoice.ShouldMarkOverdue(Vn(2027, 6, 1, 0)));
    }

    // ---------------------------------------------------------------- Gắn cờ

    /// <summary>Chưa thanh toán → Quá hạn; hạn và số tiền giữ nguyên.</summary>
    [Fact]
    public void MarkOverdue_ChuaThanhToan_SangQuaHan()
    {
        var invoice = Issued();

        invoice.MarkOverdue(FirstRunAfterDue);

        Assert.Equal(InvoiceStatus.QuaHan, invoice.Status);
        Assert.Equal(D(2026, 12, 1), invoice.DueDate);
        Assert.Equal(0, invoice.PaidAmount);
        Assert.Equal(2_350_000, invoice.RemainingAmount);
    }

    /// <summary>
    /// Tài liệu phân tích mục 8.5: quá hạn kể cả khi đã trả một phần — số đã thu 1.000.000 vẫn giữ, còn phải trả 1.350.000.
    /// </summary>
    [Fact]
    public void MarkOverdue_ThanhToanMotPhan_GiuSoDaThu()
    {
        var invoice = Issued();
        var report = invoice.ReportPayment(1_000_000, ProofPath, Vn(2026, 11, 27, 10));
        invoice.ConfirmPayment(report, 1_000_000, LandlordUserId, Vn(2026, 11, 27, 18));

        invoice.MarkOverdue(FirstRunAfterDue);

        Assert.Equal(InvoiceStatus.QuaHan, invoice.Status);
        Assert.Equal(1_000_000, invoice.PaidAmount);
        Assert.Equal(1_350_000, invoice.RemainingAmount);
    }

    /// <summary>
    /// architecture mục 7: tác vụ chạy lại mỗi giờ không gây tác dụng phụ lặp lại — hóa đơn đã Quá hạn không được chọn lần
    /// nữa, nên không gửi thông báo trùng.
    /// </summary>
    [Fact]
    public void MarkOverdue_ChayLaiCacLuotSau_KhongGanLai()
    {
        var invoice = Issued();

        invoice.MarkOverdue(FirstRunAfterDue);

        Assert.False(invoice.ShouldMarkOverdue(FirstRunAfterDue));
        Assert.False(invoice.ShouldMarkOverdue(FirstRunAfterDue.AddHours(1)));
        Assert.False(invoice.ShouldMarkOverdue(Vn(2026, 12, 20, 0)));
    }

    /// <summary>Gọi khi chưa quá hạn là lỗi lập trình — service phải kiểm tra <c>ShouldMarkOverdue</c> trước.</summary>
    [Fact]
    public void MarkOverdue_ChuaQuaHan_NemLoi()
    {
        var invoice = Issued();

        Assert.Throws<InvalidOperationException>(() => invoice.MarkOverdue(Vn(2026, 12, 1, 23, 59, 59)));
        Assert.Equal(InvoiceStatus.ChuaThanhToan, invoice.Status);
    }

    // ---------------------------------------------------------------- Sau khi quá hạn

    /// <summary>
    /// FR-50: Chủ trọ sửa hóa đơn Quá hạn lúc 10 giờ sáng 03/12 → Chưa thanh toán, hạn mới 08/12. Tác vụ không gắn cờ lại
    /// tới hết ngày 08/12; từ 0 giờ ngày 09/12 hóa đơn quá hạn lần nữa — hạn mới nên lần nhắc này không phải nhắc trùng.
    /// </summary>
    [Fact]
    public void ShouldMarkOverdue_SuaHoaDonQuaHan_TinhTheoHanMoi()
    {
        var invoice = Issued();
        invoice.MarkOverdue(FirstRunAfterDue);

        invoice.ResetPaymentAfterEdit(Vn(2026, 12, 3, 10), PaymentDueDays);

        Assert.Equal(InvoiceStatus.ChuaThanhToan, invoice.Status);
        Assert.Equal(D(2026, 12, 8), invoice.DueDate);
        Assert.False(invoice.ShouldMarkOverdue(Vn(2026, 12, 8, 23, 59, 59)));
        Assert.True(invoice.ShouldMarkOverdue(Vn(2026, 12, 9, 0)));
    }

    /// <summary>
    /// FR-96: hóa đơn thanh lý số dư dương 1.499.678 được người thuê đồng ý lúc 9 giờ sáng 17/12 → Chưa thanh toán, hạn
    /// 22/12. Hợp đồng hoàn tất thanh lý rồi thì phần còn thiếu vẫn là khoản nợ và vẫn bị gắn cờ quá hạn từ 0 giờ 23/12.
    /// </summary>
    [Fact]
    public void MarkOverdue_HoaDonThanhLySoDuDuong_VanBiGanCo()
    {
        var invoice = new Invoice
        {
            Id = 13,
            ContractId = 4,
            Type = InvoiceType.ThanhLy,
            PeriodStart = D(2026, 12, 1),
            PeriodEnd = D(2026, 12, 15),
            TotalAmount = 1_499_678,
            Status = InvoiceStatus.Nhap
        };
        invoice.SendSettlement(Vn(2026, 12, 16, 10));
        invoice.ConfirmSettlementByTenant(Vn(2026, 12, 17, 9), PaymentDueDays);

        Assert.Equal(D(2026, 12, 22), invoice.DueDate);
        Assert.False(invoice.ShouldMarkOverdue(Vn(2026, 12, 22, 23, 59, 59)));

        invoice.MarkOverdue(Vn(2026, 12, 23, 0));

        Assert.Equal(InvoiceStatus.QuaHan, invoice.Status);
        Assert.Equal(1_499_678, invoice.RemainingAmount);
    }
}
