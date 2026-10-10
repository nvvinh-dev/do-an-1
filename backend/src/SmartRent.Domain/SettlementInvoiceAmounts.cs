namespace SmartRent.Domain;

/// <summary>
/// Các khoản tiền của hóa đơn thanh lý do server tính. <see cref="LinesAmount"/> là tổng các dòng — công nợ kỳ trước,
/// bồi thường hư hỏng, phí phạt, điều chỉnh và dòng trừ tiền cọc (âm); <see cref="TotalAmount"/> = tiền phòng + điện
/// + nước + phí dịch vụ + tổng các dòng, và có thể âm (FR-55, FR-58).
/// </summary>
public sealed record SettlementInvoiceAmounts(
    decimal RentAmount,
    decimal ElectricityAmount,
    decimal WaterAmount,
    decimal ServiceFeeAmount,
    decimal LinesAmount,
    decimal TotalAmount)
{
    /// <summary>Số dư dương: số tiền người thuê còn phải trả; số dư âm hoặc bằng 0 thì là 0 (FR-58).</summary>
    public decimal AmountDueFromTenant => Math.Max(TotalAmount, 0);

    /// <summary>
    /// Số dư âm: phần cọc dư Chủ trọ phải hoàn, bằng −<see cref="TotalAmount"/>; số dư dương hoặc bằng 0 thì là 0.
    /// Số tiền hoàn do hệ thống tính, Chủ trọ không nhập (FR-58, FR-86).
    /// </summary>
    public decimal DepositRefundAmount => Math.Max(-TotalAmount, 0);

    /// <summary>
    /// Mọi khoản được lưu vào hóa đơn — tiền phòng, điện, nước, phí dịch vụ và tổng — vừa cột tiền (<see cref="MoneyLimits"/>).
    /// Số hoàn cọc bằng −tổng nên cũng vừa. Sai thì service trả 422.
    /// </summary>
    public bool FitsMoneyColumns
        => new[] { RentAmount, ElectricityAmount, WaterAmount, ServiceFeeAmount, TotalAmount }.All(MoneyLimits.Fits);
}
