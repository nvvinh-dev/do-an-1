namespace SmartRent.Domain;

/// <summary>
/// Mọi "ngày" nghiệp vụ — hôm nay, ngày bắt đầu hợp đồng, ngày vào ở, hạn thanh toán — tính theo
/// giờ Việt Nam (kiến trúc mục 7.1). Việt Nam không đổi giờ theo mùa nên dùng thẳng độ lệch UTC+7.
/// </summary>
public static class VietnamTime
{
    private static readonly TimeSpan Offset = TimeSpan.FromHours(7);

    /// <summary>Một thời điểm biểu diễn theo giờ Việt Nam, để hiển thị giờ và ngày cho người dùng.</summary>
    public static DateTimeOffset ToVietnamTime(DateTimeOffset instant) => instant.ToOffset(Offset);

    /// <summary>Ngày theo lịch Việt Nam của một thời điểm.</summary>
    public static DateOnly DateOf(DateTimeOffset instant)
        => DateOnly.FromDateTime(instant.ToOffset(Offset).DateTime);

    /// <summary>
    /// Thời điểm 0 giờ của một ngày theo lịch Việt Nam, trả ở UTC để so thẳng với cột timestamptz
    /// (Npgsql chỉ nhận DateTimeOffset ở UTC).
    /// </summary>
    public static DateTimeOffset StartOf(DateOnly date)
        => new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue), Offset).ToUniversalTime();
}
