namespace SmartRent.Domain;

/// <summary>
/// Các khoản tiền của một hóa đơn định kỳ do server tính. <see cref="AdjustmentAmount"/> là tổng các dòng
/// Điều chỉnh; <see cref="TotalAmount"/> = tiền phòng + điện + nước + phí dịch vụ + điều chỉnh (FR-41).
/// </summary>
public sealed record PeriodicInvoiceAmounts(
    decimal RentAmount,
    decimal ElectricityAmount,
    decimal WaterAmount,
    decimal ServiceFeeAmount,
    decimal AdjustmentAmount,
    decimal TotalAmount)
{
    /// <summary>
    /// Tổng hóa đơn định kỳ không được âm (FR-41) — khoản giảm lớn hơn tiền tháng thì chia sang các kỳ sau.
    /// </summary>
    public bool IsTotalAllowed => TotalAmount >= 0;

    /// <summary>
    /// Mọi khoản được lưu vào hóa đơn — tiền phòng, điện, nước, phí dịch vụ và tổng — vừa cột tiền (<see cref="MoneyLimits"/>).
    /// Chỉ số và số tiền từng dòng đã qua validator, nhưng tiền điện, nước và tổng tính từ chúng vẫn có thể vượt. Sai thì
    /// service trả 422.
    /// </summary>
    public bool FitsMoneyColumns
        => new[] { RentAmount, ElectricityAmount, WaterAmount, ServiceFeeAmount, TotalAmount }.All(MoneyLimits.Fits);
}
