namespace SmartRent.Domain;

/// <summary>
/// Mọi "ngày" nghiệp vụ — hôm nay, ngày bắt đầu hợp đồng, ngày vào ở, hạn thanh toán — tính theo
/// giờ Việt Nam (kiến trúc mục 7.1). Việt Nam không đổi giờ theo mùa nên dùng thẳng độ lệch UTC+7.
/// </summary>
public static class VietnamTime
{
    private static readonly TimeSpan Offset = TimeSpan.FromHours(7);

    /// <summary>Ngày theo lịch Việt Nam của một thời điểm.</summary>
    public static DateOnly DateOf(DateTimeOffset instant)
        => DateOnly.FromDateTime(instant.ToOffset(Offset).DateTime);
}
