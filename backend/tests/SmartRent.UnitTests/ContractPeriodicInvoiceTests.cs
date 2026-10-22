using SmartRent.Domain;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

/// <summary>
/// Điều kiện lập hóa đơn định kỳ và kỳ của nó — BR-15, BR-17, FR-43, FR-88, FR-91, api-design mục 9 "Kỳ hóa đơn do server
/// xác định", "Kiểm tra khi tạo". Hợp đồng bắt đầu 15/10/2026, kết thúc 14/10/2027.
/// </summary>
public class ContractPeriodicInvoiceTests
{
    private static DateOnly D(int year, int month, int day) => new(year, month, day);

    private static Contract NewContract(
        ContractStatus status = ContractStatus.DangHieuLuc,
        DateOnly? expectedMoveOutDate = null) => new()
    {
        Id = 1,
        StartDate = D(2026, 10, 15),
        EndDate = D(2027, 10, 14),
        Status = status,
        ExpectedMoveOutDate = expectedMoveOutDate
    };

    private static Invoice NewInvoice(
        long id,
        InvoiceType type,
        DateOnly periodStart,
        DateOnly periodEnd,
        InvoiceStatus status) => new()
    {
        Id = id,
        ContractId = 1,
        Type = type,
        PeriodStart = periodStart,
        PeriodEnd = periodEnd,
        Status = status
    };

    /// <summary>Hóa đơn định kỳ trọn tháng <paramref name="month"/> năm <paramref name="year"/>.</summary>
    private static Invoice Monthly(long id, int year, int month, InvoiceStatus status = InvoiceStatus.DaThanhToan)
        => NewInvoice(id, InvoiceType.DinhKy, D(year, month, 1), D(year, month, DateTime.DaysInMonth(year, month)), status);

    /// <summary>Kỳ đầu tiên 15/10 – 31/10.</summary>
    private static Invoice October(long id = 1, InvoiceStatus status = InvoiceStatus.DaThanhToan)
        => NewInvoice(id, InvoiceType.DinhKy, D(2026, 10, 15), D(2026, 10, 31), status);

    // ------------------------------------------------------------ Kỳ kế tiếp

    /// <summary>FR-91: chưa có hóa đơn nào thì kỳ đầu tiên chạy từ ngày bắt đầu hợp đồng tới cuối tháng đó.</summary>
    [Fact]
    public void NextBillingPeriod_ChuaCoHoaDon_KyDauTu15Den31Thang10()
    {
        Assert.Equal(new BillingPeriod(D(2026, 10, 15), D(2026, 10, 31)), NewContract().NextBillingPeriod([]));
    }

    /// <summary>BR-15: tháng 10 đã có hóa đơn thì kỳ kế tiếp là trọn tháng 11.</summary>
    [Fact]
    public void NextBillingPeriod_DaCoKyDau_TronThang11()
    {
        Assert.Equal(new BillingPeriod(D(2026, 11, 1), D(2026, 11, 30)), NewContract().NextBillingPeriod([October()]));
    }

    /// <summary>
    /// BR-17: hóa đơn tháng 11 bị hủy không chặn việc lập lại kỳ đó — kỳ kế tiếp vẫn là tháng 11, không nhảy sang tháng 12.
    /// </summary>
    [Fact]
    public void NextBillingPeriod_HoaDonGanNhatDaHuy_LapLaiKyDo()
    {
        var invoices = new[] { October(), Monthly(2, 2026, 11, InvoiceStatus.DaHuy) };

        Assert.Equal(new BillingPeriod(D(2026, 11, 1), D(2026, 11, 30)), NewContract().NextBillingPeriod(invoices));
    }

    /// <summary>Hóa đơn kỳ đầu bị hủy, chưa lập lại: kỳ kế tiếp vẫn là kỳ đầu tiên 15/10 – 31/10.</summary>
    [Fact]
    public void NextBillingPeriod_ChiCoHoaDonDaHuy_VanLaKyDau()
    {
        var invoices = new[] { October(status: InvoiceStatus.DaHuy) };

        Assert.Equal(new BillingPeriod(D(2026, 10, 15), D(2026, 10, 31)), NewContract().NextBillingPeriod(invoices));
    }

    /// <summary>
    /// Tháng 11 hủy rồi lập lại (chưa thanh toán): hóa đơn đã hủy xen giữa không tính, kỳ kế tiếp là tháng 12 — không phụ
    /// thuộc thứ tự các hóa đơn được truyền vào.
    /// </summary>
    [Fact]
    public void NextBillingPeriod_HoaDonDaHuyXenGiua_SauKyLapLai()
    {
        var invoices = new[]
        {
            Monthly(3, 2026, 11, InvoiceStatus.ChuaThanhToan),
            October(),
            Monthly(2, 2026, 11, InvoiceStatus.DaHuy)
        };

        Assert.Equal(new BillingPeriod(D(2026, 12, 1), D(2026, 12, 31)), NewContract().NextBillingPeriod(invoices));
    }

    /// <summary>Hóa đơn ở Nháp vẫn là kỳ chưa hủy — kỳ kế tiếp tính sau nó (service chặn lập khi còn Nháp).</summary>
    [Fact]
    public void NextBillingPeriod_HoaDonNhap_TinhLaKyChuaHuy()
    {
        var invoices = new[] { October(), Monthly(2, 2026, 11, InvoiceStatus.Nhap) };

        Assert.Equal(new BillingPeriod(D(2026, 12, 1), D(2026, 12, 31)), NewContract().NextBillingPeriod(invoices));
    }

    /// <summary>Sau tháng 12 là tháng 1 năm sau.</summary>
    [Fact]
    public void NextBillingPeriod_SauThang12_Thang1NamSau()
    {
        var invoices = new[] { October(), Monthly(2, 2026, 11), Monthly(3, 2026, 12) };

        Assert.Equal(new BillingPeriod(D(2027, 1, 1), D(2027, 1, 31)), NewContract().NextBillingPeriod(invoices));
    }

    /// <summary>
    /// Kỳ chỉ tính theo hóa đơn định kỳ: hóa đơn thanh lý 01/11 – 15/11 không làm kỳ kế tiếp thành tháng 12. Hợp đồng đã
    /// có hóa đơn thanh lý thì service trả 409 trước khi tới đây (FR-91).
    /// </summary>
    [Fact]
    public void NextBillingPeriod_BoQuaHoaDonThanhLy()
    {
        var invoices = new[]
        {
            October(),
            NewInvoice(2, InvoiceType.ThanhLy, D(2026, 11, 1), D(2026, 11, 15), InvoiceStatus.Nhap)
        };

        Assert.Equal(new BillingPeriod(D(2026, 11, 1), D(2026, 11, 30)), NewContract().NextBillingPeriod(invoices));
    }

    // ------------------------------------------------------------ Trạng thái và ngày bắt đầu

    /// <summary>
    /// FR-91: chỉ lập hóa đơn định kỳ khi hợp đồng ở Đang hiệu lực, Sắp hết hạn hoặc Đang thanh lý và đã tới ngày bắt đầu
    /// 15/10/2026. Hợp đồng chưa có hiệu lực, đã thanh lý hoặc đã hủy thì không.
    /// </summary>
    [Theory]
    [InlineData(ContractStatus.DangHieuLuc, 2026, 10, 15, true)]
    [InlineData(ContractStatus.DangHieuLuc, 2026, 10, 14, false)]
    [InlineData(ContractStatus.DangHieuLuc, 2026, 11, 26, true)]
    [InlineData(ContractStatus.SapHetHan, 2027, 10, 1, true)]
    [InlineData(ContractStatus.DangThanhLy, 2026, 12, 1, true)]
    [InlineData(ContractStatus.Nhap, 2026, 11, 26, false)]
    [InlineData(ContractStatus.ChoNguoiThueXacNhan, 2026, 11, 26, false)]
    [InlineData(ContractStatus.ChoNhanCoc, 2026, 11, 26, false)]
    [InlineData(ContractStatus.DaThanhLy, 2026, 12, 1, false)]
    [InlineData(ContractStatus.DaHuy, 2026, 12, 1, false)]
    public void CanCreatePeriodicInvoice(ContractStatus status, int year, int month, int day, bool expected)
    {
        Assert.Equal(expected, NewContract(status).CanCreatePeriodicInvoice(D(year, month, day)));
    }

    /// <summary>
    /// FR-88: hợp đồng qua ngày kết thúc 14/10/2027 mà chưa có thông báo trả phòng vẫn hiệu lực theo điều khoản đã chốt —
    /// ngày 26/11/2027 vẫn lập được hóa đơn tháng 11/2027.
    /// </summary>
    [Fact]
    public void CanCreatePeriodicInvoice_QuaNgayKetThucChuaCoThongBao_VanLapDuoc()
    {
        var contract = NewContract(ContractStatus.SapHetHan);
        var november2027 = new BillingPeriod(D(2027, 11, 1), D(2027, 11, 30));

        Assert.True(contract.CanCreatePeriodicInvoice(D(2027, 11, 26)));
        Assert.False(contract.IsPeriodicInvoiceBlockedByMoveOut(november2027));
    }

    // ------------------------------------------------------------ Tháng trả phòng

    /// <summary>
    /// FR-88, FR-91: hợp đồng đang thanh lý, ngày trả phòng dự kiến 15/12/2026 — hóa đơn định kỳ dừng ở tháng 11; tháng
    /// 12 và các tháng sau thuộc hóa đơn thanh lý.
    /// </summary>
    [Theory]
    [InlineData(2026, 11, false)]
    [InlineData(2026, 12, true)]
    [InlineData(2027, 1, true)]
    public void IsPeriodicInvoiceBlockedByMoveOut_TraPhong15Thang12(int year, int month, bool expected)
    {
        var contract = NewContract(ContractStatus.DangThanhLy, D(2026, 12, 15));
        var period = new BillingPeriod(D(year, month, 1), D(year, month, DateTime.DaysInMonth(year, month)));

        Assert.Equal(expected, contract.IsPeriodicInvoiceBlockedByMoveOut(period));
    }

    /// <summary>Ngày trả phòng dự kiến 31/10/2026 nằm trong kỳ đầu tiên: kỳ đầu cũng không lập hóa đơn định kỳ.</summary>
    [Fact]
    public void IsPeriodicInvoiceBlockedByMoveOut_TraPhongTrongKyDau_BiChan()
    {
        var contract = NewContract(ContractStatus.DangThanhLy, D(2026, 10, 31));

        Assert.True(contract.IsPeriodicInvoiceBlockedByMoveOut(BillingPeriod.First(contract.StartDate)));
    }

    /// <summary>Chưa có thông báo trả phòng thì không có tháng nào bị chặn.</summary>
    [Fact]
    public void IsPeriodicInvoiceBlockedByMoveOut_ChuaCoThongBao_KhongChan()
    {
        var december = new BillingPeriod(D(2026, 12, 1), D(2026, 12, 31));

        Assert.False(NewContract().IsPeriodicInvoiceBlockedByMoveOut(december));
    }

    // ------------------------------------------------------------ Hóa đơn định kỳ mới nhất

    /// <summary>
    /// FR-49, FR-52: hóa đơn định kỳ mới nhất là hóa đơn chưa hủy có kỳ muộn nhất — tháng 12 dù được lập (id) trước
    /// hóa đơn tháng 11 lập lại sau khi hủy.
    /// </summary>
    [Fact]
    public void LatestPeriodicInvoice_KyMuonNhatChuaHuy()
    {
        Invoice[] invoices =
        [
            October(1),
            Monthly(2, 2026, 11, InvoiceStatus.DaHuy),
            Monthly(4, 2026, 11),
            Monthly(3, 2026, 12, InvoiceStatus.ChuaThanhToan)
        ];

        Assert.Equal(3, NewContract().LatestPeriodicInvoice(invoices)!.Id);
    }

    /// <summary>Hóa đơn tháng 12 bị hủy thì hóa đơn tháng 11 trở lại là mới nhất — sửa, hủy được.</summary>
    [Fact]
    public void LatestPeriodicInvoice_KyCuoiDaHuy_LuiVeKyTruoc()
    {
        Invoice[] invoices =
        [
            October(1),
            Monthly(2, 2026, 11, InvoiceStatus.ChuaThanhToan),
            Monthly(3, 2026, 12, InvoiceStatus.DaHuy)
        ];

        Assert.Equal(2, NewContract().LatestPeriodicInvoice(invoices)!.Id);
    }

    /// <summary>Hóa đơn thanh lý không phải hóa đơn định kỳ: không tính khi tìm hóa đơn mới nhất để sửa, hủy.</summary>
    [Fact]
    public void LatestPeriodicInvoice_BoQuaHoaDonThanhLy()
    {
        Invoice[] invoices =
        [
            October(1),
            NewInvoice(2, InvoiceType.ThanhLy, D(2026, 11, 1), D(2026, 11, 10), InvoiceStatus.Nhap)
        ];

        Assert.Equal(1, NewContract().LatestPeriodicInvoice(invoices)!.Id);
    }

    [Fact]
    public void LatestPeriodicInvoice_ChiCoHoaDonDaHuy_Null()
    {
        Assert.Null(NewContract().LatestPeriodicInvoice([October(1, InvoiceStatus.DaHuy)]));
    }
}
