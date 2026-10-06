namespace SmartRent.Domain;

/// <summary>
/// Kỳ hóa đơn: một đoạn ngày nằm trọn trong một tháng dương lịch, do hệ thống xác định —
/// Chủ trọ không tự chọn ngày đầu và ngày cuối kỳ (BR-15, BR-17, FR-43).
/// </summary>
public sealed record BillingPeriod
{
    /// <summary>Ngày đầu và ngày cuối phải cùng một tháng, ngày cuối không trước ngày đầu.</summary>
    public BillingPeriod(DateOnly start, DateOnly end) => throw new NotImplementedException();

    public DateOnly Start { get; }

    public DateOnly End { get; }

    /// <summary>Số ngày tính tiền, gồm cả ngày đầu và ngày cuối kỳ (BR-15).</summary>
    public int DaysCharged => throw new NotImplementedException();

    /// <summary>Số ngày của tháng chứa kỳ.</summary>
    public int DaysInMonth => throw new NotImplementedException();

    /// <summary>Kỳ đầu tiên: từ ngày bắt đầu hợp đồng tới cuối tháng đó (FR-91).</summary>
    public static BillingPeriod First(DateOnly contractStartDate) => throw new NotImplementedException();

    /// <summary>Kỳ kế tiếp: trọn tháng liền sau kỳ này.</summary>
    public BillingPeriod Next() => throw new NotImplementedException();

    /// <summary>
    /// Lập được hóa đơn cho kỳ này vào ngày <paramref name="today"/> (giờ Việt Nam): tháng của kỳ đã kết thúc,
    /// hoặc đang là tháng của kỳ và từ ngày 25 trở đi (FR-91).
    /// </summary>
    public bool CanBeInvoicedOn(DateOnly today) => throw new NotImplementedException();

    /// <summary>
    /// Kỳ thuộc tháng chứa <paramref name="date"/>. Dùng cho ngày trả phòng dự kiến:
    /// tháng đó không có hóa đơn định kỳ mà thuộc hóa đơn thanh lý.
    /// </summary>
    public bool IsMonthOf(DateOnly date) => throw new NotImplementedException();
}
