namespace SmartRent.Domain;

/// <summary>
/// Doanh thu theo tháng trên dashboard Chủ trọ (FR-66, FR-67): tổng số tiền Chủ trọ đã xác nhận thu, gom theo tháng
/// của thời điểm xác nhận theo giờ Việt Nam, cho 6 tháng gần nhất tính cả tháng hiện tại. Tiền cọc không phải doanh thu
/// — bên gọi chỉ đưa vào các lượt báo thanh toán đã xác nhận.
/// </summary>
public static class MonthlyRevenue
{
    public const int MonthsShown = 6;

    /// <summary>Ngày 1 của tháng cũ nhất được hiển thị.</summary>
    public static DateOnly FirstMonth(DateOnly today)
        => new DateOnly(today.Year, today.Month, 1).AddMonths(-(MonthsShown - 1));

    /// <summary>Thời điểm, ở UTC, bắt đầu tháng cũ nhất — lọc các lượt xác nhận từ thời điểm này trở đi.</summary>
    public static DateTimeOffset WindowStart(DateOnly today) => VietnamTime.StartOf(FirstMonth(today));

    /// <summary>
    /// Mỗi tháng một phần tử, từ cũ tới mới; tháng không có khoản thu ghi 0. Khoản xác nhận ngoài sáu tháng bị bỏ qua.
    /// </summary>
    public static IReadOnlyList<RevenueMonth> Summarize(
        IEnumerable<(DateTimeOffset ConfirmedAt, decimal Amount)> payments,
        DateOnly today)
    {
        var firstMonth = FirstMonth(today);

        var totals = payments
            .Select(p => (Month: MonthOf(VietnamTime.DateOf(p.ConfirmedAt)), p.Amount))
            .GroupBy(p => p.Month)
            .ToDictionary(g => g.Key, g => g.Sum(p => p.Amount));

        return Enumerable.Range(0, MonthsShown)
            .Select(offset => firstMonth.AddMonths(offset))
            .Select(month => new RevenueMonth(month, totals.GetValueOrDefault(month)))
            .ToList();
    }

    private static DateOnly MonthOf(DateOnly date) => new(date.Year, date.Month, 1);
}
