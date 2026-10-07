namespace SmartRent.Domain;

/// <summary>
/// Kỳ hóa đơn: một đoạn ngày nằm trọn trong một tháng dương lịch, do hệ thống xác định —
/// Chủ trọ không tự chọn ngày đầu và ngày cuối kỳ (BR-15, BR-17, FR-43).
/// </summary>
public sealed record BillingPeriod
{
    /// <summary>Ngày đầu và ngày cuối phải cùng một tháng, ngày cuối không trước ngày đầu.</summary>
    public BillingPeriod(DateOnly start, DateOnly end)
    {
        if (start.Year != end.Year || start.Month != end.Month)
            throw new ArgumentException($"Kỳ {start:O} – {end:O} không nằm trọn trong một tháng.", nameof(end));
        if (end < start)
            throw new ArgumentException($"Kỳ {start:O} – {end:O} có ngày cuối trước ngày đầu.", nameof(end));

        Start = start;
        End = end;
    }

    public DateOnly Start { get; }

    public DateOnly End { get; }

    /// <summary>Số ngày tính tiền, gồm cả ngày đầu và ngày cuối kỳ (BR-15).</summary>
    public int DaysCharged => End.DayNumber - Start.DayNumber + 1;

    /// <summary>Số ngày của tháng chứa kỳ.</summary>
    public int DaysInMonth => DateTime.DaysInMonth(Start.Year, Start.Month);

    /// <summary>Kỳ đầu tiên: từ ngày bắt đầu hợp đồng tới cuối tháng đó (FR-91).</summary>
    public static BillingPeriod First(DateOnly contractStartDate)
    {
        var lastDay = DateTime.DaysInMonth(contractStartDate.Year, contractStartDate.Month);
        return new BillingPeriod(contractStartDate, new DateOnly(contractStartDate.Year, contractStartDate.Month, lastDay));
    }

    /// <summary>Kỳ kế tiếp: trọn tháng liền sau kỳ này.</summary>
    public BillingPeriod Next() => throw new NotImplementedException();

    /// <summary>
    /// Lập được hóa đơn cho kỳ này vào ngày <paramref name="today"/> (giờ Việt Nam): tháng của kỳ đã kết thúc,
    /// hoặc đang là tháng của kỳ và từ ngày 25 trở đi (FR-91).
    /// </summary>
    public bool CanBeInvoicedOn(DateOnly today) => throw new NotImplementedException();

    /// <summary>
    /// Kỳ thuộc tháng chứa ngày trả phòng dự kiến hoặc một tháng sau đó. Hợp đồng đã có thông báo trả phòng
    /// không lập hóa đơn định kỳ cho các kỳ này — phần đó thuộc hóa đơn thanh lý (FR-88, FR-91).
    /// </summary>
    public bool IsInOrAfterMoveOutMonth(DateOnly expectedMoveOutDate) => throw new NotImplementedException();
}
