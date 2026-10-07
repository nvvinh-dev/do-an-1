namespace SmartRent.Domain;

/// <summary>
/// Kỳ của hóa đơn thanh lý (FR-93, database-design mục 6.1), do hệ thống xác định từ kỳ định kỳ cuối cùng và
/// ngày trả phòng thực tế — Chủ trọ không tự chọn. <see cref="IncludesRentAndServiceFees"/> sai khi tháng trả phòng
/// đã có hóa đơn định kỳ: hóa đơn thanh lý chỉ tính điện nước, kỳ là đúng ngày trả phòng.
/// </summary>
public sealed record SettlementPeriod(DateOnly Start, DateOnly End, bool IncludesRentAndServiceFees)
{
    /// <summary>
    /// Hai trường hợp lập được hóa đơn thanh lý (FR-93):
    /// <list type="bullet">
    /// <item>Ngày trả phòng thuộc tháng ngay sau kỳ định kỳ cuối cùng — hợp đồng chưa có hóa đơn định kỳ thì thuộc
    /// tháng của ngày bắt đầu: kỳ chạy từ ngày sau kỳ cuối (hoặc ngày bắt đầu) tới ngày trả phòng, có tiền phòng và
    /// phí dịch vụ theo tỷ lệ ngày (BR-15).</item>
    /// <item>Ngày trả phòng thuộc chính tháng của kỳ định kỳ cuối cùng: kỳ bắt đầu và kết thúc ở ngày trả phòng,
    /// không có tiền phòng và phí dịch vụ.</item>
    /// </list>
    /// Trường hợp khác trả <c>null</c> — service trả 409, Chủ trọ lập trước hóa đơn định kỳ của các tháng còn thiếu.
    /// </summary>
    /// <param name="contractStartDate">Ngày bắt đầu hợp đồng.</param>
    /// <param name="lastPeriodicPeriod">
    /// Kỳ của hóa đơn định kỳ chưa hủy gần nhất; <c>null</c> khi hợp đồng chưa có hóa đơn định kỳ. Service bỏ qua
    /// hóa đơn đã hủy và tự chặn trường hợp còn hóa đơn định kỳ ở Nháp.
    /// </param>
    /// <param name="moveOutDate">Ngày trả phòng thực tế Chủ trọ nhập khi chốt số lần cuối.</param>
    /// <remarks>Ngày trả phòng trước ngày bắt đầu hợp đồng không thuộc trường hợp nào, cũng trả <c>null</c>.</remarks>
    public static SettlementPeriod? For(DateOnly contractStartDate, BillingPeriod? lastPeriodicPeriod, DateOnly moveOutDate)
    {
        if (moveOutDate < contractStartDate)
            return null;

        if (lastPeriodicPeriod is null)
            return IsSameMonth(contractStartDate, moveOutDate)
                ? new SettlementPeriod(contractStartDate, moveOutDate, IncludesRentAndServiceFees: true)
                : null;

        if (IsSameMonth(lastPeriodicPeriod.Start, moveOutDate))
            return new SettlementPeriod(moveOutDate, moveOutDate, IncludesRentAndServiceFees: false);

        var nextMonth = lastPeriodicPeriod.Next();
        return IsSameMonth(nextMonth.Start, moveOutDate)
            ? new SettlementPeriod(nextMonth.Start, moveOutDate, IncludesRentAndServiceFees: true)
            : null;
    }

    private static bool IsSameMonth(DateOnly a, DateOnly b) => a.Year == b.Year && a.Month == b.Month;
}
