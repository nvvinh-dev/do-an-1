using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

/// <summary>
/// Vòng đời hóa đơn thanh lý — BP-10, FR-57, FR-95, database-design mục 6.1 "Vòng đời hóa đơn thanh lý":
/// gửi, người thuê yêu cầu sửa hoặc đồng ý, Chủ trọ tự chốt sau 7 ngày, và trạng thái khi khóa theo dấu số dư.
/// Hợp đồng cho 5 ngày thanh toán kể từ lúc khóa.
/// </summary>
public class InvoiceSettlementLifecycleTests
{
    private const int PaymentDueDays = 5;

    private static DateOnly D(int year, int month, int day) => new(year, month, day);

    /// <summary>Một thời điểm theo giờ Việt Nam.</summary>
    private static DateTimeOffset Vn(int year, int month, int day, int hour, int minute = 0)
        => new(year, month, day, hour, minute, 0, TimeSpan.FromHours(7));

    private static Invoice Settlement(InvoiceStatus status = InvoiceStatus.Nhap, decimal total = 1_499_678) => new()
    {
        Id = 13,
        ContractId = 4,
        Type = InvoiceType.ThanhLy,
        PeriodStart = D(2026, 12, 1),
        PeriodEnd = D(2026, 12, 15),
        TotalAmount = total,
        Status = status
    };

    /// <summary>Bảng đã gửi lúc 10 giờ sáng 16/12 và đang chờ người thuê.</summary>
    private static Invoice Sent(decimal total = 1_499_678)
    {
        var invoice = Settlement(total: total);
        invoice.SendSettlement(Vn(2026, 12, 16, 10));
        return invoice;
    }

    // ---------------------------------------------------------------- Gửi

    /// <summary>FR-57: gửi bảng ở Nháp → Chờ người thuê xác nhận, ghi lần gửi gần nhất.</summary>
    [Fact]
    public void SendSettlement_Nhap_ChoNguoiThueXacNhan_GhiSentAt()
    {
        var invoice = Settlement();

        invoice.SendSettlement(Vn(2026, 12, 16, 10));

        Assert.Equal(InvoiceStatus.ChoNguoiThueXacNhan, invoice.Status);
        Assert.Equal(Vn(2026, 12, 16, 10), invoice.SentAt);
    }

    /// <summary>Chỉ bảng thanh lý ở Nháp mới gửi được; hóa đơn định kỳ không có bước gửi cho người thuê xác nhận.</summary>
    [Theory]
    [InlineData(InvoiceType.ThanhLy, InvoiceStatus.Nhap, true)]
    [InlineData(InvoiceType.ThanhLy, InvoiceStatus.ChoNguoiThueXacNhan, false)]
    [InlineData(InvoiceType.ThanhLy, InvoiceStatus.ChuaThanhToan, false)]
    [InlineData(InvoiceType.DinhKy, InvoiceStatus.Nhap, false)]
    public void CanSendSettlement_ChiBangThanhLyONhap(InvoiceType type, InvoiceStatus status, bool expected)
    {
        var invoice = Settlement(status);
        invoice.Type = type;

        Assert.Equal(expected, invoice.CanSendSettlement);
    }

    [Fact]
    public void SendSettlement_DaGui_NemLoiVaGiuNguyen()
    {
        var invoice = Sent();

        Assert.Throws<InvalidOperationException>(() => invoice.SendSettlement(Vn(2026, 12, 17, 10)));
        Assert.Equal(Vn(2026, 12, 16, 10), invoice.SentAt);
    }

    // ---------------------------------------------------------------- Người thuê chưa đồng ý

    /// <summary>FR-57: người thuê chưa đồng ý kèm lý do → bảng về Nháp để Chủ trọ sửa, lưu lý do gần nhất.</summary>
    [Fact]
    public void RequestSettlementChanges_VeNhap_LuuLyDo()
    {
        var invoice = Sent();

        invoice.RequestSettlementChanges("Kính cửa sổ đã vỡ từ lúc nhận phòng");

        Assert.Equal(InvoiceStatus.Nhap, invoice.Status);
        Assert.Equal("Kính cửa sổ đã vỡ từ lúc nhận phòng", invoice.ChangeRequestReason);
    }

    /// <summary>Bảng còn ở Nháp — người thuê chưa thấy — thì chưa yêu cầu sửa hay đồng ý được.</summary>
    [Fact]
    public void RequestSettlementChanges_ConNhap_NemLoi()
    {
        Assert.Throws<InvalidOperationException>(() => Settlement().RequestSettlementChanges("x"));
    }

    // ---------------------------------------------------------------- Người thuê đồng ý: khóa theo dấu số dư

    /// <summary>
    /// FR-57, database-design mục 6.1: số dư dương 1.499.678 → Chưa thanh toán, phát hành lúc khóa; hạn thanh toán tính
    /// từ lúc bảng bị khóa (BP-10 bước 6) — đồng ý 16/12 thì hạn 21/12.
    /// </summary>
    [Fact]
    public void ConfirmSettlementByTenant_SoDuDuong_ChuaThanhToanCoHan()
    {
        var invoice = Sent();
        var now = Vn(2026, 12, 16, 20);

        invoice.ConfirmSettlementByTenant(now, PaymentDueDays);

        Assert.Equal(InvoiceStatus.ChuaThanhToan, invoice.Status);
        Assert.Equal(now, invoice.TenantConfirmedAt);
        Assert.Equal(now, invoice.IssuedAt);
        Assert.Equal(D(2026, 12, 21), invoice.DueDate);
        Assert.Null(invoice.SettledAt);
    }

    /// <summary>Hạn thanh toán tính theo ngày Việt Nam của lúc khóa: 00:30 sáng 17/12 giờ Việt Nam vẫn là ngày 17.</summary>
    [Fact]
    public void ConfirmSettlementByTenant_SauNuaDemGioVietNam_HanTinhTuNgayMoi()
    {
        var invoice = Sent();

        invoice.ConfirmSettlementByTenant(Vn(2026, 12, 17, 0, 30), PaymentDueDays);

        Assert.Equal(D(2026, 12, 22), invoice.DueDate);
    }

    /// <summary>FR-57, FR-58: số dư âm −920.322 → Chờ hoàn cọc; không có hạn thanh toán vì người thuê không phải trả.</summary>
    [Fact]
    public void ConfirmSettlementByTenant_SoDuAm_ChoHoanCoc()
    {
        var invoice = Sent(total: -920_322);

        invoice.ConfirmSettlementByTenant(Vn(2026, 12, 16, 20), PaymentDueDays);

        Assert.Equal(InvoiceStatus.ChoHoanCoc, invoice.Status);
        Assert.Null(invoice.IssuedAt);
        Assert.Null(invoice.DueDate);
        Assert.Null(invoice.SettledAt);
    }

    /// <summary>database-design mục 6.1: số dư bằng 0 → Đã thanh toán ngay lúc khóa, ghi thời điểm tất toán.</summary>
    [Fact]
    public void ConfirmSettlementByTenant_SoDuBang0_DaThanhToan()
    {
        var invoice = Sent(total: 0);
        var now = Vn(2026, 12, 16, 20);

        invoice.ConfirmSettlementByTenant(now, PaymentDueDays);

        Assert.Equal(InvoiceStatus.DaThanhToan, invoice.Status);
        Assert.Equal(now, invoice.SettledAt);
        Assert.Null(invoice.DueDate);
    }

    [Fact]
    public void ConfirmSettlementByTenant_ConNhap_NemLoiVaGiuNguyen()
    {
        var invoice = Settlement();

        Assert.Throws<InvalidOperationException>(() => invoice.ConfirmSettlementByTenant(Vn(2026, 12, 16, 20), PaymentDueDays));
        Assert.Equal(InvoiceStatus.Nhap, invoice.Status);
        Assert.Null(invoice.TenantConfirmedAt);
    }

    // ---------------------------------------------------------------- Chủ trọ tự chốt sau 7 ngày

    /// <summary>
    /// FR-95, architecture mục 7.1: hạn 7 ngày bắt đầu từ một thời điểm nên tính đủ 168 giờ kể từ lần gửi. Gửi 10:00 ngày
    /// 16/12 thì tới 10:00 ngày 23/12 vẫn chưa quá hạn; từ 10:01 tự chốt được.
    /// </summary>
    [Theory]
    [InlineData(22, 23, 59, false)]
    [InlineData(23, 10, 0, false)]
    [InlineData(23, 10, 1, true)]
    [InlineData(30, 9, 0, true)]
    public void CanFinalizeSettlement_QuaDu168GioTuLanGui(int day, int hour, int minute, bool expected)
    {
        Assert.Equal(expected, Sent().CanFinalizeSettlement(Vn(2026, 12, day, hour, minute)));
    }

    /// <summary>
    /// FR-95: 7 ngày tính từ lần gửi gần nhất. Gửi 01/12, người thuê yêu cầu sửa, Chủ trọ gửi lại 05/12 — tới 10/12 mới
    /// được 5 ngày từ lần gửi lại nên chưa tự chốt được.
    /// </summary>
    [Fact]
    public void CanFinalizeSettlement_TinhTuLanGuiGanNhat()
    {
        var invoice = Settlement();
        invoice.SendSettlement(Vn(2026, 12, 1, 10));
        invoice.RequestSettlementChanges("Sai chỉ số điện");
        invoice.SendSettlement(Vn(2026, 12, 5, 10));

        Assert.False(invoice.CanFinalizeSettlement(Vn(2026, 12, 10, 10)));
        Assert.True(invoice.CanFinalizeSettlement(Vn(2026, 12, 12, 10, 1)));
    }

    /// <summary>Chỉ tự chốt bảng đang chờ người thuê: bảng ở Nháp hoặc đã khóa thì không.</summary>
    [Theory]
    [InlineData(InvoiceStatus.Nhap)]
    [InlineData(InvoiceStatus.ChuaThanhToan)]
    [InlineData(InvoiceStatus.ChoHoanCoc)]
    public void CanFinalizeSettlement_KhongChoNguoiThue_False(InvoiceStatus status)
    {
        var invoice = Settlement(status);
        invoice.SentAt = Vn(2026, 12, 1, 10);

        Assert.False(invoice.CanFinalizeSettlement(Vn(2026, 12, 30, 10)));
    }

    /// <summary>
    /// FR-95: tự chốt ghi chú của Chủ trọ và đi tiếp như khi người thuê đồng ý — số dư dương thành khoản chờ thanh toán.
    /// Người thuê không đồng ý nên không có thời điểm người thuê xác nhận.
    /// </summary>
    [Fact]
    public void FinalizeSettlementByLandlord_GhiChu_KhoaNhuKhiDongY()
    {
        var invoice = Sent();
        var now = Vn(2026, 12, 24, 9);

        invoice.FinalizeSettlementByLandlord("Đã nhắn tin và gọi điện, người thuê không phản hồi", now, PaymentDueDays);

        Assert.Equal(InvoiceStatus.ChuaThanhToan, invoice.Status);
        Assert.Equal("Đã nhắn tin và gọi điện, người thuê không phản hồi", invoice.LandlordFinalizeNote);
        Assert.Null(invoice.TenantConfirmedAt);
        Assert.Equal(now, invoice.IssuedAt);
        Assert.Equal(D(2026, 12, 29), invoice.DueDate);
    }

    [Fact]
    public void FinalizeSettlementByLandlord_SoDuAm_ChoHoanCoc()
    {
        var invoice = Sent(total: -920_322);

        invoice.FinalizeSettlementByLandlord("Người thuê không phản hồi", Vn(2026, 12, 24, 9), PaymentDueDays);

        Assert.Equal(InvoiceStatus.ChoHoanCoc, invoice.Status);
    }

    /// <summary>FR-95: chưa quá 7 ngày thì chưa tự chốt được — gọi là lỗi lập trình, bảng giữ nguyên.</summary>
    [Fact]
    public void FinalizeSettlementByLandlord_ChuaQua7Ngay_NemLoiVaGiuNguyen()
    {
        var invoice = Sent();

        Assert.Throws<InvalidOperationException>(
            () => invoice.FinalizeSettlementByLandlord("x", Vn(2026, 12, 20, 9), PaymentDueDays));
        Assert.Equal(InvoiceStatus.ChoNguoiThueXacNhan, invoice.Status);
        Assert.Null(invoice.LandlordFinalizeNote);
    }
}
