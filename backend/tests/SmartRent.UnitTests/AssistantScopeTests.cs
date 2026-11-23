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
}
