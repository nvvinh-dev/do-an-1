using SmartRent.Domain;
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
}
