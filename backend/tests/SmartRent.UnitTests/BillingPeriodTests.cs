using SmartRent.Domain;

namespace SmartRent.UnitTests;

/// <summary>Kỳ hóa đơn do hệ thống xác định — BR-15, BR-17, FR-43, FR-91, database-design mục 6.1 "Kỳ hóa đơn".</summary>
public class BillingPeriodTests
{
    private static DateOnly D(int year, int month, int day) => new(year, month, day);

    /// <summary>FR-91: kỳ đầu tiên chạy từ ngày bắt đầu hợp đồng tới cuối tháng đó. BR-15: tính cả ngày vào ở.</summary>
    [Fact]
    public void First_BatDau15Thang10_KyTu15Den31Thang10_17Tren31Ngay()
    {
        var period = BillingPeriod.First(D(2026, 10, 15));

        Assert.Equal(D(2026, 10, 15), period.Start);
        Assert.Equal(D(2026, 10, 31), period.End);
        Assert.Equal(17, period.DaysCharged);
        Assert.Equal(31, period.DaysInMonth);
    }

    /// <summary>FR-91: hợp đồng bắt đầu ngày 1 thì kỳ đầu là trọn tháng.</summary>
    [Fact]
    public void First_BatDauNgay1_TronThang()
    {
        var period = BillingPeriod.First(D(2026, 11, 1));

        Assert.Equal(D(2026, 11, 30), period.End);
        Assert.Equal(30, period.DaysCharged);
        Assert.Equal(30, period.DaysInMonth);
    }

    /// <summary>FR-91, BR-15: bắt đầu ngày cuối tháng thì kỳ đầu chỉ có một ngày.</summary>
    [Fact]
    public void First_BatDauNgayCuoiThang_KyMotNgay()
    {
        var period = BillingPeriod.First(D(2027, 1, 31));

        Assert.Equal(D(2027, 1, 31), period.End);
        Assert.Equal(1, period.DaysCharged);
        Assert.Equal(31, period.DaysInMonth);
    }

    /// <summary>BR-17, database-design mục 6.1: mỗi kỳ sau là trọn tháng liền sau kỳ trước.</summary>
    [Fact]
    public void Next_SauKyDauThang10_LaTronThang11()
    {
        var next = BillingPeriod.First(D(2026, 10, 15)).Next();

        Assert.Equal(new BillingPeriod(D(2026, 11, 1), D(2026, 11, 30)), next);
    }

    /// <summary>BR-17: kỳ sau tháng 12 là tháng 1 năm sau.</summary>
    [Fact]
    public void Next_SauThang12_LaThang1NamSau()
    {
        var next = new BillingPeriod(D(2026, 12, 1), D(2026, 12, 31)).Next();

        Assert.Equal(new BillingPeriod(D(2027, 1, 1), D(2027, 1, 31)), next);
    }

    /// <summary>BR-15: tháng 2 năm nhuận có 29 ngày.</summary>
    [Fact]
    public void Next_Thang2NamNhuan_29Ngay()
    {
        var next = new BillingPeriod(D(2028, 1, 1), D(2028, 1, 31)).Next();

        Assert.Equal(D(2028, 2, 29), next.End);
        Assert.Equal(29, next.DaysInMonth);
    }

    /// <summary>FR-43: kỳ là một tháng dương lịch — không trải qua hai tháng, ngày cuối không trước ngày đầu.</summary>
    [Theory]
    [InlineData(2026, 10, 25, 2026, 11, 5)]
    [InlineData(2026, 10, 20, 2026, 10, 19)]
    [InlineData(2026, 12, 31, 2027, 1, 1)]
    public void Constructor_KyKhongNamTrongMotThang_NemLoi(int y1, int m1, int d1, int y2, int m2, int d2)
    {
        Assert.Throws<ArgumentException>(() => new BillingPeriod(D(y1, m1, d1), D(y2, m2, d2)));
    }

    /// <summary>FR-91: lập cho tháng đã kết thúc, hoặc cho tháng hiện tại từ ngày 25 trở đi.</summary>
    [Theory]
    [InlineData(2026, 10, 24, false)]
    [InlineData(2026, 10, 25, true)]
    [InlineData(2026, 10, 31, true)]
    [InlineData(2026, 11, 1, true)]
    [InlineData(2026, 12, 15, true)]
    [InlineData(2026, 9, 30, false)]
    public void CanBeInvoicedOn_KyThang10(int year, int month, int day, bool expected)
    {
        var october = new BillingPeriod(D(2026, 10, 1), D(2026, 10, 31));

        Assert.Equal(expected, october.CanBeInvoicedOn(D(year, month, day)));
    }

    /// <summary>FR-91: kỳ đầu tiên không trọn tháng cũng theo quy tắc ngày 25.</summary>
    [Theory]
    [InlineData(2026, 10, 15, false)]
    [InlineData(2026, 10, 24, false)]
    [InlineData(2026, 10, 25, true)]
    public void CanBeInvoicedOn_KyDauTu15Thang10(int year, int month, int day, bool expected)
    {
        var first = BillingPeriod.First(D(2026, 10, 15));

        Assert.Equal(expected, first.CanBeInvoicedOn(D(year, month, day)));
    }

    /// <summary>
    /// FR-91, database-design mục 6.1: tháng chứa ngày trả phòng dự kiến không có hóa đơn định kỳ
    /// mà thuộc hóa đơn thanh lý.
    /// </summary>
    [Theory]
    [InlineData(2026, 11, 10, true)]
    [InlineData(2026, 11, 1, true)]
    [InlineData(2026, 11, 30, true)]
    [InlineData(2026, 12, 1, false)]
    [InlineData(2026, 10, 31, false)]
    [InlineData(2027, 11, 10, false)]
    public void IsMonthOf_NgayTraPhongDuKien_KyThang11(int year, int month, int day, bool expected)
    {
        var november = new BillingPeriod(D(2026, 11, 1), D(2026, 11, 30));

        Assert.Equal(expected, november.IsMonthOf(D(year, month, day)));
    }
}
