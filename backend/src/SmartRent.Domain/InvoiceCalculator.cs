using SmartRent.Domain.Entities;

namespace SmartRent.Domain;

/// <summary>
/// Công thức tiền của hóa đơn định kỳ (BP-07). Mọi số tiền do server tính được làm tròn đến đồng,
/// <see cref="MidpointRounding.AwayFromZero"/> (database-design mục 1).
/// </summary>
public static class InvoiceCalculator
{
    /// <summary>Làm tròn đến đồng, nửa đồng làm tròn ra xa số 0.</summary>
    public static decimal RoundToDong(decimal amount) => Math.Round(amount, 0, MidpointRounding.AwayFromZero);

    /// <summary>
    /// Khoản theo tháng tính cho một kỳ: số tiền × số ngày ở ÷ số ngày của tháng, làm tròn đến đồng.
    /// Kỳ trọn tháng ra đúng số tiền tháng (BR-15, FR-42).
    /// </summary>
    /// <remarks>Nhân trước rồi mới chia và chỉ làm tròn một lần ở cuối, để không cộng dồn sai số.</remarks>
    public static decimal Prorate(decimal monthlyAmount, BillingPeriod period)
        => RoundToDong(monthlyAmount * period.DaysCharged / period.DaysInMonth);

    /// <summary>
    /// Tiền điện hoặc nước = (chỉ số mới − chỉ số cũ) × đơn giá, làm tròn đến đồng (BR-14).
    /// Chỉ số không hợp lệ thì ném <see cref="ArgumentException"/> — service phải kiểm tra trước và trả 422.
    /// </summary>
    public static decimal MeterAmount(MeterReading reading, decimal unitPrice) => throw new NotImplementedException();

    /// <summary>
    /// Tính hóa đơn định kỳ từ giá đã chốt trong hợp đồng — không dùng giá hiện tại của phòng (BR-12, BR-13, FR-40).
    /// Tiền phòng và tổng phí dịch vụ tính theo tỷ lệ ngày của kỳ (BR-15); <paramref name="adjustments"/> là các dòng
    /// Điều chỉnh của hóa đơn (FR-41).
    /// </summary>
    public static PeriodicInvoiceAmounts CalculatePeriodic(
        Contract contract,
        BillingPeriod period,
        MeterReading electricity,
        MeterReading water,
        IEnumerable<InvoiceLine> adjustments)
        => throw new NotImplementedException();
}
