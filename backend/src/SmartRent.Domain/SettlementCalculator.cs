using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.Domain;

/// <summary>
/// Công thức tiền của hóa đơn thanh lý (BP-10). Tiền phòng, phí dịch vụ và điện nước dùng chung công thức với hóa đơn
/// định kỳ ở <see cref="InvoiceCalculator"/>; mọi số tiền làm tròn đến đồng.
/// </summary>
public static class SettlementCalculator
{
    /// <summary>
    /// Dòng trừ tiền cọc do hệ thống tự thêm: <see cref="InvoiceLineCategory.KhauTruTienCoc"/>, số tiền bằng
    /// −tiền cọc ghi trong hợp đồng; hợp đồng không cọc thì không có dòng này, trả <c>null</c> (FR-55, api-design mục 10).
    /// </summary>
    public static InvoiceLine? DepositDeductionLine(Contract contract)
        => contract.DepositAmount <= 0
            ? null
            : new InvoiceLine
            {
                Category = InvoiceLineCategory.KhauTruTienCoc,
                Description = "Trừ tiền cọc đã nộp",
                Amount = -contract.DepositAmount
            };

    /// <summary>
    /// BR-22, FR-87: các dòng <see cref="InvoiceLineCategory.PhiPhat"/> Chủ trọ gửi chỉ hợp lệ khi
    /// <see cref="Contract.IsMoveOutPenaltyAllowed"/> đúng và tổng phí phạt không vượt tiền cọc. Không có dòng phí phạt
    /// thì luôn hợp lệ. Sai thì service trả 422.
    /// </summary>
    /// <param name="landlordLines">Các dòng Chủ trọ gửi lên, chưa gồm dòng do hệ thống tự thêm.</param>
    public static bool IsPenaltyAllowed(Contract contract, IEnumerable<InvoiceLine> landlordLines)
    {
        var penalties = landlordLines.Where(l => l.Category == InvoiceLineCategory.PhiPhat).ToList();

        return penalties.Count == 0
               || (contract.IsMoveOutPenaltyAllowed && penalties.Sum(l => l.Amount) <= contract.DepositAmount);
    }

    /// <summary>
    /// Tính hóa đơn thanh lý từ giá đã chốt trong hợp đồng (BR-12, BR-13). Tiền phòng và tổng phí dịch vụ tính theo
    /// tỷ lệ ngày của <paramref name="period"/> (BR-15), bằng 0 khi kỳ không tính tiền phòng (FR-93). Domain tự ghép danh
    /// sách dòng theo thứ tự FR-55 và tự thêm dòng trừ tiền cọc (<see cref="DepositDeductionLine"/>), nên tổng luôn trừ
    /// tiền cọc đúng một lần — bên gọi không tự thêm dòng này (RK-03).
    /// </summary>
    /// <param name="carriedOverLines">
    /// Dòng công nợ kỳ trước: dòng mới từ <see cref="Invoice.CarryOverToSettlement"/> khi lập, hoặc dòng đã lưu khi sửa.
    /// </param>
    /// <param name="landlordLines">Các dòng Chủ trọ gửi: bồi thường hư hỏng, phí phạt, điều chỉnh.</param>
    /// <remarks>
    /// Service phải nạp <see cref="Contract.ServiceFees"/> trước khi gọi. Chỉ số mới nhỏ hơn chỉ số cũ, hoặc dòng sai loại
    /// ở từng danh sách, thì ném <see cref="ArgumentException"/> — service kiểm tra trước và trả 422.
    /// </remarks>
    public static SettlementInvoiceCalculation Calculate(
        Contract contract,
        SettlementPeriod period,
        MeterReading electricity,
        MeterReading water,
        IEnumerable<InvoiceLine> carriedOverLines,
        IEnumerable<InvoiceLine> landlordLines)
    {
        var debts = carriedOverLines.ToList();
        var landlord = landlordLines.ToList();

        if (debts.FirstOrDefault(l => l.Category != InvoiceLineCategory.CongNoKyTruoc) is { } notDebt)
            throw new ArgumentException($"Dòng công nợ kỳ trước không nhận loại {notDebt.Category}.", nameof(carriedOverLines));
        if (landlord.FirstOrDefault(l => !InvoiceLine.IsAllowedFromLandlordOnSettlement(l.Category)) is { } systemLine)
            throw new ArgumentException($"Chủ trọ không gửi được dòng loại {systemLine.Category}.", nameof(landlordLines));

        var lines = debts.Concat(landlord).ToList();

        if (DepositDeductionLine(contract) is { } depositLine)
            lines.Add(depositLine);

        var electricityAmount = InvoiceCalculator.MeterAmount(electricity, contract.ElectricityUnitPrice);
        var waterAmount = InvoiceCalculator.MeterAmount(water, contract.WaterUnitPrice);
        decimal rentAmount = 0;
        decimal serviceFeeAmount = 0;

        if (period.IncludesRentAndServiceFees)
        {
            var billingPeriod = new BillingPeriod(period.Start, period.End);
            rentAmount = InvoiceCalculator.Prorate(contract.RentPrice, billingPeriod);
            serviceFeeAmount = InvoiceCalculator.Prorate(contract.ServiceFees.Sum(f => f.Amount), billingPeriod);
        }

        var linesAmount = lines.Sum(l => l.Amount);

        return new SettlementInvoiceCalculation(
            lines,
            new SettlementInvoiceAmounts(
                RentAmount: rentAmount,
                ElectricityAmount: electricityAmount,
                WaterAmount: waterAmount,
                ServiceFeeAmount: serviceFeeAmount,
                LinesAmount: linesAmount,
                TotalAmount: rentAmount + electricityAmount + waterAmount + serviceFeeAmount + linesAmount));
    }
}
