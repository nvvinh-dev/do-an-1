using SmartRent.Domain;

namespace SmartRent.UnitTests;

public class VietnamTimeTests
{
    [Fact]
    public void DateOf_SauMuoiBayGioUtc_DaSangNgayMoiOVietNam()
    {
        var instant = new DateTimeOffset(2026, 10, 3, 17, 0, 0, TimeSpan.Zero);

        Assert.Equal(new DateOnly(2026, 10, 4), VietnamTime.DateOf(instant));
    }

    [Fact]
    public void DateOf_TruocMuoiBayGioUtc_VanLaNgayCu()
    {
        var instant = new DateTimeOffset(2026, 10, 3, 16, 59, 59, TimeSpan.Zero);

        Assert.Equal(new DateOnly(2026, 10, 3), VietnamTime.DateOf(instant));
    }

    /// <summary>0 giờ ngày 01/10 giờ Việt Nam là 17 giờ ngày 30/09 UTC; trả ở UTC để so thẳng với cột timestamptz.</summary>
    [Fact]
    public void StartOf_Ngay1Thang10_La17GioUtcNgayHomTruoc()
    {
        var start = VietnamTime.StartOf(new DateOnly(2026, 10, 1));

        Assert.Equal(new DateTimeOffset(2026, 9, 30, 17, 0, 0, TimeSpan.Zero), start);
        Assert.Equal(TimeSpan.Zero, start.Offset);
    }
}
