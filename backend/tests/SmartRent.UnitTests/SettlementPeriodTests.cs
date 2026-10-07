using SmartRent.Domain;

namespace SmartRent.UnitTests;

/// <summary>
/// Kỳ của hóa đơn thanh lý — BP-10, FR-93, database-design mục 6.1 "Kỳ của hóa đơn thanh lý".
/// Hợp đồng bắt đầu 15/10/2026; kỳ định kỳ đầu tiên là 15/10 – 31/10, các kỳ sau là trọn tháng.
/// </summary>
public class SettlementPeriodTests
{
    private static readonly DateOnly StartDate = new(2026, 10, 15);

    private static DateOnly D(int year, int month, int day) => new(year, month, day);

    private static BillingPeriod FirstPeriod => BillingPeriod.First(StartDate);

    private static BillingPeriod Month(int year, int month)
        => new(D(year, month, 1), D(year, month, DateTime.DaysInMonth(year, month)));

    // ------------------------------ Trường hợp 1: tháng ngay sau kỳ định kỳ cuối cùng

    /// <summary>
    /// FR-93: hóa đơn định kỳ cuối là tháng 11, trả phòng 15/12 — hóa đơn thanh lý tính từ 01/12 tới 15/12,
    /// có tiền phòng và phí dịch vụ.
    /// </summary>
    [Fact]
    public void For_TraPhongThangNgaySauKyCuoi_TuDauThangToiNgayTra()
    {
        Assert.Equal(
            new SettlementPeriod(D(2026, 12, 1), D(2026, 12, 15), IncludesRentAndServiceFees: true),
            SettlementPeriod.For(StartDate, Month(2026, 11), D(2026, 12, 15)));
    }

    /// <summary>
    /// FR-93: hợp đồng chưa có hóa đơn định kỳ thì ngày trả phòng thuộc tháng của ngày bắt đầu — vào ở 15/10,
    /// trả phòng 25/10, hóa đơn thanh lý tính từ 15/10 tới 25/10.
    /// </summary>
    [Fact]
    public void For_ChuaCoHoaDonDinhKy_TuNgayBatDauToiNgayTra()
    {
        Assert.Equal(
            new SettlementPeriod(StartDate, D(2026, 10, 25), IncludesRentAndServiceFees: true),
            SettlementPeriod.For(StartDate, lastPeriodicPeriod: null, D(2026, 10, 25)));
    }

    /// <summary>FR-93: kỳ định kỳ cuối là tháng 12, trả phòng 10/01 năm sau — "tháng ngay sau" đi qua năm mới.</summary>
    [Fact]
    public void For_KyCuoiThang12_TraPhongThang1NamSau()
    {
        Assert.Equal(
            new SettlementPeriod(D(2027, 1, 1), D(2027, 1, 10), IncludesRentAndServiceFees: true),
            SettlementPeriod.For(StartDate, Month(2026, 12), D(2027, 1, 10)));
    }

    // ------------------------------ Trường hợp 2: tháng trả phòng đã có hóa đơn định kỳ

    /// <summary>
    /// FR-93: hóa đơn tháng 12 đã lập trước khi có thông báo (báo gấp) — hóa đơn thanh lý không tính tiền phòng,
    /// phí dịch vụ; kỳ bắt đầu và kết thúc ở ngày trả phòng, chỉ tính điện nước từ lần chốt gần nhất.
    /// </summary>
    [Theory]
    [InlineData(15)]
    [InlineData(1)]
    [InlineData(31)]
    public void For_ThangTraPhongDaCoHoaDonDinhKy_ChiTinhDienNuoc(int moveOutDay)
    {
        var moveOutDate = D(2026, 12, moveOutDay);

        Assert.Equal(
            new SettlementPeriod(moveOutDate, moveOutDate, IncludesRentAndServiceFees: false),
            SettlementPeriod.For(StartDate, Month(2026, 12), moveOutDate));
    }

    /// <summary>
    /// FR-93: người thuê dọn đi sớm hơn dự kiến, ngay trong kỳ định kỳ đầu tiên (15/10 – 31/10) đã lập —
    /// trả phòng 20/10, hóa đơn thanh lý chỉ tính điện nước.
    /// </summary>
    [Fact]
    public void For_DonDiSomTrongKyDauDaLapHoaDon_ChiTinhDienNuoc()
    {
        Assert.Equal(
            new SettlementPeriod(D(2026, 10, 20), D(2026, 10, 20), IncludesRentAndServiceFees: false),
            SettlementPeriod.For(StartDate, FirstPeriod, D(2026, 10, 20)));
    }

    // ------------------------------ Trường hợp khác: từ chối (409)

    /// <summary>
    /// FR-93: hóa đơn định kỳ cuối là kỳ tháng 10, trả phòng 15/12 — còn thiếu hóa đơn tháng 11 nên chưa lập được
    /// hóa đơn thanh lý; Chủ trọ lập hóa đơn tháng 11 trước.
    /// </summary>
    [Fact]
    public void For_ConThieuHoaDonThangTruocThangTraPhong_Null()
    {
        Assert.Null(SettlementPeriod.For(StartDate, FirstPeriod, D(2026, 12, 15)));
    }

    /// <summary>
    /// FR-93: chưa có hóa đơn định kỳ mà trả phòng 05/11, sau tháng của ngày bắt đầu — phải lập hóa đơn
    /// kỳ 15/10 – 31/10 trước.
    /// </summary>
    [Fact]
    public void For_ChuaCoHoaDonDinhKyMaTraPhongSauThangBatDau_Null()
    {
        Assert.Null(SettlementPeriod.For(StartDate, lastPeriodicPeriod: null, D(2026, 11, 5)));
    }

    /// <summary>
    /// FR-93: đã có hóa đơn định kỳ tháng 12 mà ngày trả phòng 20/11 nằm ở tháng trước đó — không thuộc trường hợp nào
    /// được lập.
    /// </summary>
    [Fact]
    public void For_TraPhongTruocThangCuaKyCuoi_Null()
    {
        Assert.Null(SettlementPeriod.For(StartDate, Month(2026, 12), D(2026, 11, 20)));
    }
}
