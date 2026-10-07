using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

/// <summary>
/// Kết chuyển công nợ vào hóa đơn thanh lý — BP-10, FR-92, database-design mục 6.1 "Kết chuyển công nợ".
/// Hóa đơn tháng 11/2026 tổng 3.420.000.
/// </summary>
public class InvoiceCarryOverTests
{
    private static Invoice NewInvoice(InvoiceStatus status, decimal paidAmount = 0) => new()
    {
        Id = 12,
        ContractId = 1,
        Type = InvoiceType.DinhKy,
        PeriodStart = new DateOnly(2026, 11, 1),
        PeriodEnd = new DateOnly(2026, 11, 30),
        TotalAmount = 3_420_000,
        PaidAmount = paidAmount,
        Status = status
    };

    /// <summary>FR-92: chỉ hóa đơn còn nợ — Chưa thanh toán, Thanh toán một phần, Quá hạn — được kết chuyển.</summary>
    [Theory]
    [InlineData(InvoiceStatus.ChuaThanhToan, true)]
    [InlineData(InvoiceStatus.ThanhToanMotPhan, true)]
    [InlineData(InvoiceStatus.QuaHan, true)]
    [InlineData(InvoiceStatus.Nhap, false)]
    [InlineData(InvoiceStatus.ChoXacNhan, false)]
    [InlineData(InvoiceStatus.DaThanhToan, false)]
    [InlineData(InvoiceStatus.DaHuy, false)]
    [InlineData(InvoiceStatus.DaChuyenThanhLy, false)]
    [InlineData(InvoiceStatus.ChoNguoiThueXacNhan, false)]
    [InlineData(InvoiceStatus.ChoHoanCoc, false)]
    public void CanCarryOverToSettlement_ChiHoaDonConNo(InvoiceStatus status, bool expected)
    {
        Assert.Equal(expected, NewInvoice(status).CanCarryOverToSettlement);
    }

    /// <summary>
    /// FR-92: hóa đơn 3.420.000 đã thu 2.000.000 thành một dòng công nợ kỳ trước 1.420.000 — đúng phần còn phải trả,
    /// có mô tả (BR-22) và trỏ về hóa đơn gốc.
    /// </summary>
    [Fact]
    public void CarryOverToSettlement_ThanhToanMotPhan_DongCongNoBangPhanConThieu()
    {
        var invoice = NewInvoice(InvoiceStatus.ThanhToanMotPhan, paidAmount: 2_000_000);

        var line = invoice.CarryOverToSettlement();

        Assert.Equal(InvoiceLineCategory.CongNoKyTruoc, line.Category);
        Assert.Equal(1_420_000m, line.Amount);
        Assert.Equal(12L, line.RelatedInvoiceId);
        Assert.False(string.IsNullOrWhiteSpace(line.Description));
    }

    /// <summary>FR-92: hóa đơn chưa thu đồng nào, kể cả đã quá hạn, chuyển nguyên tổng tiền thành công nợ.</summary>
    [Theory]
    [InlineData(InvoiceStatus.ChuaThanhToan)]
    [InlineData(InvoiceStatus.QuaHan)]
    public void CarryOverToSettlement_ChuaThuDongNao_CongNoBangTongTien(InvoiceStatus status)
    {
        Assert.Equal(3_420_000m, NewInvoice(status).CarryOverToSettlement().Amount);
    }

    /// <summary>
    /// FR-92: hóa đơn gốc chuyển Đã chuyển thanh lý — không còn bị nhắc quá hạn, không nhận báo thanh toán riêng.
    /// </summary>
    [Theory]
    [InlineData(InvoiceStatus.ChuaThanhToan)]
    [InlineData(InvoiceStatus.ThanhToanMotPhan)]
    [InlineData(InvoiceStatus.QuaHan)]
    public void CarryOverToSettlement_HoaDonGocChuyenDaChuyenThanhLy(InvoiceStatus status)
    {
        var invoice = NewInvoice(status, paidAmount: status == InvoiceStatus.ThanhToanMotPhan ? 2_000_000 : 0);

        invoice.CarryOverToSettlement();

        Assert.Equal(InvoiceStatus.DaChuyenThanhLy, invoice.Status);
    }

    /// <summary>Hóa đơn đã thanh toán đủ không có gì để kết chuyển: gọi là lỗi lập trình, hóa đơn giữ nguyên.</summary>
    [Fact]
    public void CarryOverToSettlement_DaThanhToan_NemLoiVaGiuNguyen()
    {
        var invoice = NewInvoice(InvoiceStatus.DaThanhToan, paidAmount: 3_420_000);

        Assert.Throws<InvalidOperationException>(() => invoice.CarryOverToSettlement());
        Assert.Equal(InvoiceStatus.DaThanhToan, invoice.Status);
    }
}
