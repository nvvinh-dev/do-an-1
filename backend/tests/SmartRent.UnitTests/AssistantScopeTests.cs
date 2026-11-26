using SmartRent.Domain;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

/// <summary>Lọc dẫn chiếu của trợ lý AI — FR-129, BR-18.</summary>
public class AssistantScopeTests
{
    /// <summary>Người thuê có hợp đồng 12, hóa đơn 40 và 41, sự cố 7 — đúng những gì server đã gửi cho AI.</summary>
    private static readonly HashSet<AssistantReference> Sent =
    [
        new(AssistantReferenceType.Contract, 12),
        new(AssistantReferenceType.Invoice, 40),
        new(AssistantReferenceType.Invoice, 41),
        new(AssistantReferenceType.MaintenanceRequest, 7)
    ];

    [Fact]
    public void KeepSentReferences_GiuBanGhiDaGui_TheoThuTuAiTraVe()
    {
        var kept = AssistantScope.KeepSentReferences(
            [("Invoice", 41), ("Contract", 12)], Sent);

        Assert.Equal(
            [new AssistantReference(AssistantReferenceType.Invoice, 41), new AssistantReference(AssistantReferenceType.Contract, 12)],
            kept);
    }

    [Fact]
    public void KeepSentReferences_BoBanGhiKhongCoTrongDuLieuDaGui()
    {
        // Hóa đơn 99 của người khác, hợp đồng 40 trùng số với hóa đơn 40 nhưng khác loại.
        var kept = AssistantScope.KeepSentReferences(
            [("Invoice", 99), ("Contract", 40), ("Invoice", 40)], Sent);

        Assert.Equal([new AssistantReference(AssistantReferenceType.Invoice, 40)], kept);
    }

    [Fact]
    public void KeepSentReferences_BoPhongKhiKhongGuiPhong()
    {
        // Người thuê không được gửi danh sách phòng, nên AI nhắc phòng nào cũng bị bỏ.
        var kept = AssistantScope.KeepSentReferences([("Room", 12)], Sent);

        Assert.Empty(kept);
    }

    [Theory]
    [InlineData("invoice")]
    [InlineData(" INVOICE ")]
    public void KeepSentReferences_NhanTenLoaiKhongPhanBietHoaThuong(string type)
    {
        var kept = AssistantScope.KeepSentReferences([(type, 40)], Sent);

        Assert.Equal([new AssistantReference(AssistantReferenceType.Invoice, 40)], kept);
    }

    [Theory]
    [InlineData("1")]
    [InlineData("HoaDon")]
    [InlineData("")]
    [InlineData(null)]
    public void KeepSentReferences_BoLoaiKhongDungTen(string? type)
    {
        // "1" là giá trị số của Invoice — Enum.TryParse nhận nhưng dẫn chiếu chỉ nhận đúng tên.
        var kept = AssistantScope.KeepSentReferences([(type, 40)], Sent);

        Assert.Empty(kept);
    }

    [Fact]
    public void KeepSentReferences_BoBanGhiTrung()
    {
        var kept = AssistantScope.KeepSentReferences(
            [("MaintenanceRequest", 7), ("maintenancerequest", 7), ("Contract", 12), ("MaintenanceRequest", 7)], Sent);

        Assert.Equal(
            [new AssistantReference(AssistantReferenceType.MaintenanceRequest, 7), new AssistantReference(AssistantReferenceType.Contract, 12)],
            kept);
    }

    [Theory]
    [InlineData(InvoiceType.DinhKy, InvoiceStatus.ChuaThanhToan, 3_000_000, 0, 3_000_000)]
    [InlineData(InvoiceType.DinhKy, InvoiceStatus.ChoXacNhan, 3_000_000, 0, 3_000_000)]
    [InlineData(InvoiceType.DinhKy, InvoiceStatus.ThanhToanMotPhan, 3_000_000, 1_000_000, 2_000_000)]
    [InlineData(InvoiceType.DinhKy, InvoiceStatus.QuaHan, 2_492_500, 0, 2_492_500)]
    [InlineData(InvoiceType.ThanhLy, InvoiceStatus.ChuaThanhToan, 500_000, 0, 500_000)]
    [InlineData(InvoiceType.ThanhLy, InvoiceStatus.ChoNguoiThueXacNhan, 1_200_000, 0, 1_200_000)]
    [InlineData(InvoiceType.ThanhLy, InvoiceStatus.ChoHoanCoc, -1_500_000, 0, -1_500_000)]
    public void RemainingToReport_GuiSoConPhaiTra_KhiHoaDonConPhaiThu(
        InvoiceType type, InvoiceStatus status, long total, long paid, long expected)
    {
        Assert.Equal(expected, AssistantScope.RemainingToReport(type, status, total, paid));
    }

    [Theory]
    [InlineData(InvoiceType.DinhKy, InvoiceStatus.Nhap, 3_000_000, 0)]
    [InlineData(InvoiceType.DinhKy, InvoiceStatus.DaThanhToan, 3_000_000, 3_000_000)]
    [InlineData(InvoiceType.DinhKy, InvoiceStatus.DaHuy, 3_000_000, 0)]
    [InlineData(InvoiceType.DinhKy, InvoiceStatus.DaChuyenThanhLy, 2_492_500, 0)]
    [InlineData(InvoiceType.ThanhLy, InvoiceStatus.Nhap, -1_500_000, 0)]
    [InlineData(InvoiceType.ThanhLy, InvoiceStatus.DaThanhToan, -1_500_000, 0)]
    public void RemainingToReport_KhongGui_KhiHoaDonKhongConPhaiThu(
        InvoiceType type, InvoiceStatus status, long total, long paid)
    {
        // Đã chuyển vào thanh lý: phần nợ đã nằm trong hóa đơn thanh lý (FR-92), gửi cả hai thì trợ lý tính trùng nợ.
        Assert.Null(AssistantScope.RemainingToReport(type, status, total, paid));
    }

    [Theory]
    [InlineData(InvoiceStatus.ChoNguoiThueXacNhan)]
    [InlineData(InvoiceStatus.ChoHoanCoc)]
    public void RemainingToReport_TrangThaiCuaThanhLy_KhongApChoHoaDonDinhKy(InvoiceStatus status)
    {
        Assert.Null(AssistantScope.RemainingToReport(InvoiceType.DinhKy, status, 3_000_000, 0));
    }

    private static Invoice NewInvoice(long id, InvoiceType type, InvoiceStatus status, int month) => new()
    {
        Id = id,
        Type = type,
        Status = status,
        PeriodStart = new DateOnly(2026, month, 1)
    };

    [Fact]
    public void OrderInvoicesToSend_HoaDonConPhaiThuXepTruoc_RoiToiKyMoiHon()
    {
        // Ví dụ của dev-chutro-1: #44 quá hạn kỳ 3, #27 thanh lý quá hạn kỳ 2 bị 12 hóa đơn đã trả kỳ mới hơn đẩy ra ngoài.
        var invoices = new List<Invoice>
        {
            NewInvoice(27, InvoiceType.ThanhLy, InvoiceStatus.QuaHan, 2),
            NewInvoice(44, InvoiceType.DinhKy, InvoiceStatus.QuaHan, 3),
            NewInvoice(63, InvoiceType.DinhKy, InvoiceStatus.ChuaThanhToan, 11),
            NewInvoice(70, InvoiceType.ThanhLy, InvoiceStatus.ChoHoanCoc, 6),
            NewInvoice(71, InvoiceType.DinhKy, InvoiceStatus.DaChuyenThanhLy, 7),
            NewInvoice(72, InvoiceType.DinhKy, InvoiceStatus.Nhap, 12)
        };
        invoices.AddRange(Enumerable.Range(0, 12)
            .Select(n => NewInvoice(100 + n, InvoiceType.DinhKy, InvoiceStatus.DaThanhToan, 1 + n % 11)));

        var ordered = AssistantScope.OrderInvoicesToSend(invoices.AsQueryable()).Select(i => i.Id).ToList();

        Assert.Equal([63L, 70, 44, 27], ordered.Take(4));
        Assert.Equal(72, ordered[4]);
    }

    [Fact]
    public void OrderInvoicesToSend_CungKy_HoaDonMoiTaoHonXepTruoc()
    {
        var invoices = new List<Invoice>
        {
            NewInvoice(5, InvoiceType.DinhKy, InvoiceStatus.QuaHan, 3),
            NewInvoice(9, InvoiceType.DinhKy, InvoiceStatus.QuaHan, 3)
        };

        var ordered = AssistantScope.OrderInvoicesToSend(invoices.AsQueryable()).Select(i => i.Id);

        Assert.Equal([9L, 5], ordered);
    }

    [Theory]
    [InlineData(0, 12)]
    [InlineData(3, 12)]
    [InlineData(12, 12)]
    [InlineData(15, 15)]
    [InlineData(50, 50)]
    [InlineData(80, 50)]
    public void InvoicesToSend_GuiHetHoaDonConPhaiThu_ItNhat12_NhieuNhat50(int outstanding, int expected)
    {
        Assert.Equal(expected, AssistantScope.InvoicesToSend(outstanding));
    }

    [Theory]
    [InlineData(InvoiceType.DinhKy, InvoiceStatus.QuaHan, true)]
    [InlineData(InvoiceType.ThanhLy, InvoiceStatus.ChoNguoiThueXacNhan, true)]
    [InlineData(InvoiceType.DinhKy, InvoiceStatus.ChoHoanCoc, false)]
    [InlineData(InvoiceType.DinhKy, InvoiceStatus.DaChuyenThanhLy, false)]
    [InlineData(InvoiceType.DinhKy, InvoiceStatus.Nhap, false)]
    public void IsOutstandingToReport_CungDieuKienVoiSoConPhaiTra(InvoiceType type, InvoiceStatus status, bool expected)
    {
        Assert.Equal(expected, AssistantScope.IsOutstandingToReport(type, status));
        Assert.Equal(expected, AssistantScope.RemainingToReport(type, status, 1_000_000, 0) is not null);
    }
}
