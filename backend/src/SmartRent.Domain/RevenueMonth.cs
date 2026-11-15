namespace SmartRent.Domain;

/// <summary>Doanh thu đã xác nhận của một tháng. <see cref="Month"/> là ngày 1 của tháng đó theo lịch Việt Nam.</summary>
public sealed record RevenueMonth(DateOnly Month, decimal Amount);
