using SmartRent.Domain;

namespace SmartRent.UnitTests;

/// <summary>
/// Doanh thu theo tháng trên dashboard Chủ trọ — FR-66, FR-67, api-design mục 12 "Cách tính":
/// gom theo tháng của thời điểm xác nhận, giờ Việt Nam, 6 tháng gần nhất tính cả tháng hiện tại.
/// </summary>
public class MonthlyRevenueTests
{
    private static readonly DateOnly Today = new(2026, 10, 7);

    private static DateTimeOffset Utc(int year, int month, int day, int hour, int minute, int second = 0)
        => new(year, month, day, hour, minute, second, TimeSpan.Zero);

    private static DateOnly Month(int year, int month) => new(year, month, 1);

    private static IReadOnlyList<RevenueMonth> Summarize(DateOnly today, params (DateTimeOffset, decimal)[] payments)
        => MonthlyRevenue.Summarize(payments, today);

    /// <summary>Hôm nay 07/10/2026: sáu tháng là 5 tới 10, tháng cũ nhất bắt đầu từ 01/05.</summary>
    [Fact]
    public void FirstMonth_Ngay7Thang10_LaNgay1Thang5()
    {
        Assert.Equal(new DateOnly(2026, 5, 1), MonthlyRevenue.FirstMonth(Today));
    }

    /// <summary>0 giờ ngày 01/05 giờ Việt Nam là 17 giờ ngày 30/04 theo UTC — mốc lọc trong database.</summary>
    [Fact]
    public void WindowStart_Ngay7Thang10_La17GioUtcNgay30Thang4()
    {
        var start = MonthlyRevenue.WindowStart(Today);

        Assert.Equal(Utc(2026, 4, 30, 17, 0), start);
        Assert.Equal(TimeSpan.Zero, start.Offset);
    }

    /// <summary>Tháng không có khoản thu nào ghi 0; mảng luôn đủ 6 tháng, từ cũ tới mới.</summary>
    [Fact]
    public void Summarize_KhongCoKhoanThu_SauThangDeuBang0()
    {
        var months = Summarize(Today);

        Assert.Equal(
            [
                new RevenueMonth(Month(2026, 5), 0),
                new RevenueMonth(Month(2026, 6), 0),
                new RevenueMonth(Month(2026, 7), 0),
                new RevenueMonth(Month(2026, 8), 0),
                new RevenueMonth(Month(2026, 9), 0),
                new RevenueMonth(Month(2026, 10), 0)
            ],
            months);
    }

    /// <summary>Hai lượt xác nhận tháng 10: 3.000.000 + 1.500.000 = 4.500.000; tháng 9 một lượt 3.200.000.</summary>
    [Fact]
    public void Summarize_NhieuLuotCungThang_CongDon()
    {
        var months = Summarize(
            Today,
            (Utc(2026, 10, 2, 3, 0), 3_000_000m),
            (Utc(2026, 10, 5, 9, 30), 1_500_000m),
            (Utc(2026, 9, 10, 2, 0), 3_200_000m));

        Assert.Equal(4_500_000m, months[5].Amount);
        Assert.Equal(3_200_000m, months[4].Amount);
        Assert.Equal(0m, months[3].Amount);
    }

    /// <summary>
    /// Xác nhận lúc 17:30 ngày 30/09 UTC là 00:30 ngày 01/10 giờ Việt Nam — tính vào tháng 10 dù theo UTC vẫn là tháng 9.
    /// </summary>
    [Fact]
    public void Summarize_SauNuaDemDauThangGioVietNam_TinhThangMoi()
    {
        var months = Summarize(Today, (Utc(2026, 9, 30, 17, 30), 2_000_000m));

        Assert.Equal(new RevenueMonth(Month(2026, 10), 2_000_000m), months[5]);
        Assert.Equal(0m, months[4].Amount);
    }

    /// <summary>Xác nhận lúc 23:59:59 ngày 30/09 giờ Việt Nam vẫn thuộc tháng 9.</summary>
    [Fact]
    public void Summarize_TruocNuaDemCuoiThangGioVietNam_TinhThangCu()
    {
        var months = Summarize(Today, (Utc(2026, 9, 30, 16, 59, 59), 2_000_000m));

        Assert.Equal(new RevenueMonth(Month(2026, 9), 2_000_000m), months[4]);
        Assert.Equal(0m, months[5].Amount);
    }

    /// <summary>
    /// Đúng 0 giờ ngày 01/05 giờ Việt Nam là tháng cũ nhất được tính; một giây trước đó (30/04) nằm ngoài sáu tháng.
    /// </summary>
    [Fact]
    public void Summarize_MepDauCuaSo_ChiTinhTuNgay1Thang5()
    {
        var months = Summarize(
            Today,
            (Utc(2026, 4, 30, 17, 0), 1_000_000m),
            (Utc(2026, 4, 30, 16, 59, 59), 9_000_000m));

        Assert.Equal(new RevenueMonth(Month(2026, 5), 1_000_000m), months[0]);
        Assert.Equal(1_000_000m, months.Sum(m => m.Amount));
    }

    /// <summary>Qua năm: hôm nay 10/02/2027 thì sáu tháng là 09/2026 tới 02/2027; giao thừa giờ Việt Nam vào tháng 1.</summary>
    [Fact]
    public void Summarize_QuaNam_ThangMotNamSau()
    {
        var months = Summarize(
            new DateOnly(2027, 2, 10),
            (Utc(2026, 12, 31, 17, 0), 3_000_000m),
            (Utc(2026, 12, 31, 16, 0), 2_500_000m));

        Assert.Equal(
            [Month(2026, 9), Month(2026, 10), Month(2026, 11), Month(2026, 12), Month(2027, 1), Month(2027, 2)],
            months.Select(m => m.Month));
        Assert.Equal(2_500_000m, months[3].Amount);
        Assert.Equal(3_000_000m, months[4].Amount);
    }
}
