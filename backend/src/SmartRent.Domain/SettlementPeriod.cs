namespace SmartRent.Domain;

/// <summary>
/// Kỳ của hóa đơn thanh lý (FR-93, database-design mục 6.1), do hệ thống xác định từ kỳ định kỳ cuối cùng và
/// ngày trả phòng thực tế — Chủ trọ không tự chọn. <see cref="IncludesRentAndServiceFees"/> sai khi tháng trả phòng
/// đã có hóa đơn định kỳ: hóa đơn thanh lý chỉ tính điện nước, kỳ là đúng ngày trả phòng.
/// </summary>
public sealed record SettlementPeriod
{
    /// <summary>
    /// Như <see cref="BillingPeriod"/>: kỳ nằm trọn trong một tháng, ngày cuối không trước ngày đầu. Kỳ chỉ tính điện
    /// nước là đúng một ngày — ngày trả phòng.
    /// </summary>
    public SettlementPeriod(DateOnly start, DateOnly end, bool includesRentAndServiceFees)
    {
        if (start.Year != end.Year || start.Month != end.Month)
            throw new ArgumentException($"Kỳ thanh lý {start:O} – {end:O} không nằm trọn trong một tháng.", nameof(end));
        if (end < start)
            throw new ArgumentException($"Kỳ thanh lý {start:O} – {end:O} có ngày cuối trước ngày đầu.", nameof(end));
        if (!includesRentAndServiceFees && start != end)
            throw new ArgumentException(
                $"Kỳ thanh lý chỉ tính điện nước phải là đúng ngày trả phòng, không phải {start:O} – {end:O}.", nameof(end));

        Start = start;
        End = end;
        IncludesRentAndServiceFees = includesRentAndServiceFees;
    }

    public DateOnly Start { get; }

    public DateOnly End { get; }

    public bool IncludesRentAndServiceFees { get; }

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
    /// <exception cref="ArgumentException">
    /// Ngày trả phòng trước ngày bắt đầu hợp đồng (FR-54) — service kiểm tra trước và trả 422.
    /// </exception>
    public static SettlementPeriod? For(DateOnly contractStartDate, BillingPeriod? lastPeriodicPeriod, DateOnly moveOutDate)
    {
        if (moveOutDate < contractStartDate)
            throw new ArgumentException(
                $"Ngày trả phòng {moveOutDate:O} trước ngày bắt đầu hợp đồng {contractStartDate:O}.", nameof(moveOutDate));

        if (lastPeriodicPeriod is null)
            return IsSameMonth(contractStartDate, moveOutDate)
                ? new SettlementPeriod(contractStartDate, moveOutDate, includesRentAndServiceFees: true)
                : null;

        if (IsSameMonth(lastPeriodicPeriod.Start, moveOutDate))
            return new SettlementPeriod(moveOutDate, moveOutDate, includesRentAndServiceFees: false);

        var nextMonth = lastPeriodicPeriod.Next();
        return IsSameMonth(nextMonth.Start, moveOutDate)
            ? new SettlementPeriod(nextMonth.Start, moveOutDate, includesRentAndServiceFees: true)
            : null;
    }

    private static bool IsSameMonth(DateOnly a, DateOnly b) => a.Year == b.Year && a.Month == b.Month;
}
