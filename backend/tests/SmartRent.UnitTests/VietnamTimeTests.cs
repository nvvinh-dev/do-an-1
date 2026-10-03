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
}
