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
    public bool IsTotalAllowed => throw new NotImplementedException();
}
