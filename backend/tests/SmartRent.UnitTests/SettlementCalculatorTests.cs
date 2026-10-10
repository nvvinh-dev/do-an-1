using SmartRent.Domain;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

/// <summary>
/// Tiền của hóa đơn thanh lý — BP-10 (RK-03: nghiệp vụ cọc, tháng lẻ, công nợ phải có test tự động).
/// Số liệu chung: hợp đồng bắt đầu 15/10/2026, kết thúc 14/10/2027, chốt giá thuê 3.000.000, điện 3.500/kWh,
/// nước 15.000/m³, phí Rác 20.000 và Wifi 100.000, tiền cọc 3.000.000. Lần chốt cuối: điện 1.250 → 1.310 (60 kWh,
/// 210.000), nước 85 → 89 (4 m³, 60.000) — đúng ví dụ ở api-design mục 10, trả phòng 15/12/2026.
/// </summary>
public class SettlementCalculatorTests
{
    private const long TenantId = 20;
    private const long LandlordId = 30;

    private static DateOnly D(int year, int month, int day) => new(year, month, day);

    private static readonly MeterReading Electricity = new(1_250, 1_310);
    private static readonly MeterReading Water = new(85, 89);

    /// <summary>Kỳ cuối 01/12 – 15/12, có tiền phòng và phí dịch vụ (FR-93).</summary>
    private static SettlementPeriod December1To15 => new(D(2026, 12, 1), D(2026, 12, 15), includesRentAndServiceFees: true);

    /// <summary>Tháng 12 đã có hóa đơn định kỳ: kỳ thanh lý chỉ là ngày trả phòng, chỉ tính điện nước (FR-93).</summary>
    private static SettlementPeriod MeterOnlyOn15December => new(D(2026, 12, 15), D(2026, 12, 15), includesRentAndServiceFees: false);

    /// <summary>
    /// Hợp đồng chốt giá thấp hơn giá hiện tại của phòng, để thấy hóa đơn thanh lý lấy giá của hợp đồng (BR-12, BR-13).
    /// </summary>
    private static Contract NewContract(decimal depositAmount = 3_000_000) => new()
    {
        Id = 1,
        TenantUserId = TenantId,
        RentPrice = 3_000_000,
        ElectricityUnitPrice = 3_500,
        WaterUnitPrice = 15_000,
        DepositAmount = depositAmount,
        StartDate = D(2026, 10, 15),
        EndDate = D(2027, 10, 14),
        Status = ContractStatus.DangHieuLuc,
        Room = new Room { RentPrice = 3_500_000, ElectricityUnitPrice = 4_000, WaterUnitPrice = 20_000 },
        ServiceFees =
        [
            new ContractServiceFee { Name = "Rác", Amount = 20_000 },
            new ContractServiceFee { Name = "Wifi", Amount = 100_000 }
        ]
    };

    /// <summary>Hợp đồng đã có thông báo trả phòng, gửi lúc 9 giờ sáng giờ Việt Nam của <paramref name="noticeDate"/>.</summary>
    private static Contract WithNotice(
        long senderId,
        DateOnly noticeDate,
        DateOnly expectedMoveOutDate,
        decimal depositAmount = 3_000_000)
    {
        var contract = NewContract(depositAmount);
        contract.SendMoveOutNotice(
            senderId,
            expectedMoveOutDate,
            "Chuyển chỗ làm",
            new DateTimeOffset(noticeDate.ToDateTime(new TimeOnly(9, 0)), TimeSpan.FromHours(7)));
        return contract;
    }

    /// <summary>Người thuê báo ngày 01/12, trả phòng 15/12 — báo trước 14 ngày, trước ngày kết thúc: được phạt.</summary>
    private static Contract TenantShortNotice(decimal depositAmount = 3_000_000)
        => WithNotice(TenantId, D(2026, 12, 1), D(2026, 12, 15), depositAmount);

    private static InvoiceLine Line(InvoiceLineCategory category, decimal amount, string description = "Khoản mục")
        => new() { Category = category, Description = description, Amount = amount };

    private static InvoiceLine Penalty(decimal amount) => Line(InvoiceLineCategory.PhiPhat, amount, "Báo trả phòng trước 14 ngày");

    private static InvoiceLine Damage(decimal amount) => Line(InvoiceLineCategory.BoiThuongHuHong, amount, "Vỡ kính cửa sổ");

    private static InvoiceLine Debt(decimal amount) => Line(InvoiceLineCategory.CongNoKyTruoc, amount, "Công nợ hóa đơn tháng 11/2026");


    // ---------------------------------------------------- Tiền phòng kỳ cuối theo tỷ lệ ngày

    /// <summary>
    /// BR-15, FR-42: trả phòng 15/12, tính cả ngày trả phòng — 15 trên 31 ngày. Tiền phòng 3.000.000 × 15 ÷ 31 =
    /// 1.451.612,90 → 1.451.613; phí dịch vụ tính trên tổng 120.000 × 15 ÷ 31 = 58.064,52 → 58.065. Giá lấy từ
    /// hợp đồng, không lấy giá hiện tại của phòng (BR-12, BR-13). Hợp đồng không cọc để chỉ thấy phần kỳ cuối.
    /// </summary>
    [Fact]
    public void Calculate_KyCuoi1Den15Thang12_TienPhongVaPhiTheoTyLe15Tren31()
    {
        var amounts = SettlementCalculator.Calculate(
            NewContract(depositAmount: 0), December1To15, Electricity, Water, [], []).Amounts;

        Assert.Equal(new SettlementInvoiceAmounts(
            RentAmount: 1_451_613,
            ElectricityAmount: 210_000,
            WaterAmount: 60_000,
            ServiceFeeAmount: 58_065,
            LinesAmount: 0,
            TotalAmount: 1_779_678), amounts);
    }

    /// <summary>
    /// BR-15, FR-42: tỷ lệ chia cho số ngày của chính tháng trả phòng. Trả phòng ngày cuối tháng là trọn tháng;
    /// trả ngày 01 tính một ngày (3.000.000 ÷ 31 = 96.774,19 → 96.774; 120.000 ÷ 31 = 3.870,97 → 3.871);
    /// tháng 2/2027 có 28 ngày, trả ngày 14 là đúng nửa tháng.
    /// </summary>
    [Theory]
    [InlineData(2026, 12, 31, 3_000_000, 120_000)]
    [InlineData(2026, 12, 1, 96_774, 3_871)]
    [InlineData(2027, 2, 14, 1_500_000, 60_000)]
    public void Calculate_TyLeTheoSoNgayCuaThangTraPhong(
        int year, int month, int moveOutDay, int expectedRent, int expectedServiceFee)
    {
        var period = new SettlementPeriod(D(year, month, 1), D(year, month, moveOutDay), includesRentAndServiceFees: true);

        var amounts = SettlementCalculator.Calculate(NewContract(), period, Electricity, Water, [], []).Amounts;

        Assert.Equal(expectedRent, amounts.RentAmount);
        Assert.Equal(expectedServiceFee, amounts.ServiceFeeAmount);
    }

    /// <summary>
    /// FR-93: tháng trả phòng đã có hóa đơn định kỳ — hóa đơn thanh lý không có tiền phòng và phí dịch vụ,
    /// chỉ tính điện nước từ lần chốt gần nhất.
    /// </summary>
    [Fact]
    public void Calculate_KyChiTinhDienNuoc_KhongCoTienPhongVaPhi()
    {
        var amounts = SettlementCalculator.Calculate(
            NewContract(depositAmount: 0), MeterOnlyOn15December, Electricity, Water, [], []).Amounts;

        Assert.Equal(new SettlementInvoiceAmounts(
            RentAmount: 0,
            ElectricityAmount: 210_000,
            WaterAmount: 60_000,
            ServiceFeeAmount: 0,
            LinesAmount: 0,
            TotalAmount: 270_000), amounts);
    }

    /// <summary>BR-14, FR-54: chỉ số chốt lần cuối nhỏ hơn chỉ số cũ — service kiểm tra trước và trả 422.</summary>
    [Fact]
    public void Calculate_ChiSoMoiNhoHonChiSoCu_NemLoi()
    {
        Assert.Throws<ArgumentException>(() => SettlementCalculator.Calculate(
            NewContract(), December1To15, new MeterReading(1_250, 1_240), Water, [], []));
    }

    // ---------------------------------------------------- Phí phạt: ba điều kiện và trần phạt

    /// <summary>
    /// BR-22, FR-87: người thuê báo trước 14 ngày, trả phòng trước ngày kết thúc — được phạt, tổng phí phạt tối đa
    /// bằng tiền cọc 3.000.000.
    /// </summary>
    [Theory]
    [InlineData(1_500_000, true)]
    [InlineData(3_000_000, true)]
    [InlineData(3_000_001, false)]
    public void IsPenaltyAllowed_NguoiThueBaoGap_KhongVuotTienCoc(int penalty, bool expected)
    {
        Assert.Equal(expected, SettlementCalculator.IsPenaltyAllowed(TenantShortNotice(), [Penalty(penalty)]));
    }

    /// <summary>BR-22: trần áp cho tổng các dòng phí phạt — 2.000.000 + 1.500.000 = 3.500.000 vượt cọc 3.000.000.</summary>
    [Fact]
    public void IsPenaltyAllowed_TongNhieuDongPhiPhatVuotTienCoc_False()
    {
        Assert.False(SettlementCalculator.IsPenaltyAllowed(
            TenantShortNotice(), [Penalty(2_000_000), Penalty(1_500_000)]));
    }

    /// <summary>BR-22: bồi thường hư hỏng không tính vào trần phí phạt — phạt đúng bằng cọc kèm bồi thường vẫn hợp lệ.</summary>
    [Fact]
    public void IsPenaltyAllowed_DongBoiThuongKhongTinhVaoTran()
    {
        Assert.True(SettlementCalculator.IsPenaltyAllowed(
            TenantShortNotice(), [Penalty(3_000_000), Damage(500_000)]));
    }

    /// <summary>
    /// BR-22, FR-87: không được phạt khi Chủ trọ là bên gửi thông báo, khi người thuê báo trước đủ 30 ngày, hoặc khi
    /// trả phòng đúng ngày kết thúc hợp đồng — dù phí phạt nhỏ hơn tiền cọc.
    /// </summary>
    [Theory]
    // Chủ trọ gửi thông báo 01/12, trả phòng 15/12.
    [InlineData(LandlordId, "2026-12-01", "2026-12-15")]
    // Người thuê báo trước đủ 30 ngày.
    [InlineData(TenantId, "2026-11-15", "2026-12-15")]
    // Người thuê báo gấp nhưng trả phòng đúng ngày kết thúc 14/10/2027.
    [InlineData(TenantId, "2027-10-04", "2027-10-14")]
    public void IsPenaltyAllowed_KhongDuDieuKienPhat_False(long senderId, string noticeDate, string expectedMoveOutDate)
    {
        var contract = WithNotice(senderId, DateOnly.Parse(noticeDate), DateOnly.Parse(expectedMoveOutDate));

        Assert.False(SettlementCalculator.IsPenaltyAllowed(contract, [Penalty(500_000)]));
    }

    /// <summary>BR-22: hợp đồng không cọc thì trần phí phạt là 0 — người thuê báo gấp cũng không bị phạt.</summary>
    [Fact]
    public void IsPenaltyAllowed_HopDongKhongCoc_False()
    {
        Assert.False(SettlementCalculator.IsPenaltyAllowed(TenantShortNotice(depositAmount: 0), [Penalty(100_000)]));
    }

    /// <summary>
    /// BR-22: không có dòng phí phạt thì không có gì để kiểm — Chủ trọ gửi thông báo vẫn ghi được bồi thường hư hỏng
    /// (BP-10 A2: khấu trừ cọc cho hư hỏng, không phí phạt).
    /// </summary>
    [Fact]
    public void IsPenaltyAllowed_KhongCoDongPhiPhat_True()
    {
        var contract = WithNotice(LandlordId, D(2026, 12, 1), D(2026, 12, 15));

        Assert.True(SettlementCalculator.IsPenaltyAllowed(contract, [Damage(300_000)]));
    }

    // ---------------------------------------------------- Dòng trừ tiền cọc và chiều số dư

    /// <summary>FR-55, api-design mục 10: dòng trừ tiền cọc do hệ thống thêm, bằng đúng −tiền cọc trong hợp đồng.</summary>
    [Fact]
    public void DepositDeductionLine_TruDungTienCocTrongHopDong()
    {
        var line = SettlementCalculator.DepositDeductionLine(NewContract());

        Assert.NotNull(line);
        Assert.Equal(InvoiceLineCategory.KhauTruTienCoc, line.Category);
        Assert.Equal(-3_000_000m, line.Amount);
        Assert.False(string.IsNullOrWhiteSpace(line.Description));
    }

    /// <summary>api-design mục 10: hợp đồng không cọc thì không thêm dòng trừ tiền cọc.</summary>
    [Fact]
    public void DepositDeductionLine_KhongCoc_Null()
    {
        Assert.Null(SettlementCalculator.DepositDeductionLine(NewContract(depositAmount: 0)));
    }

    /// <summary>
    /// FR-55, api-design mục 10: Chủ trọ chỉ gửi được dòng bồi thường hư hỏng, phí phạt, điều chỉnh; dòng công nợ
    /// kỳ trước và dòng trừ tiền cọc do hệ thống tự thêm.
    /// </summary>
    [Theory]
    [InlineData(InvoiceLineCategory.BoiThuongHuHong, true)]
    [InlineData(InvoiceLineCategory.PhiPhat, true)]
    [InlineData(InvoiceLineCategory.DieuChinhKhac, true)]
    [InlineData(InvoiceLineCategory.CongNoKyTruoc, false)]
    [InlineData(InvoiceLineCategory.KhauTruTienCoc, false)]
    public void IsAllowedFromLandlordOnSettlement_ChiDongChuTroDuocGui(InvoiceLineCategory category, bool expected)
    {
        Assert.Equal(expected, InvoiceLine.IsAllowedFromLandlordOnSettlement(category));
    }

    /// <summary>
    /// api-design mục 10: bồi thường hư hỏng và phí phạt là khoản phải thu, số tiền phải lớn hơn 0 — một dòng phạt âm
    /// làm bảng thanh lý khó đọc và lách được cách đọc trần phạt. Muốn giảm thì dùng dòng điều chỉnh, nhận cả số âm.
    /// </summary>
    [Theory]
    [InlineData(InvoiceLineCategory.BoiThuongHuHong, 300_000, true)]
    [InlineData(InvoiceLineCategory.BoiThuongHuHong, 0, false)]
    [InlineData(InvoiceLineCategory.BoiThuongHuHong, -300_000, false)]
    [InlineData(InvoiceLineCategory.PhiPhat, 1_000_000, true)]
    [InlineData(InvoiceLineCategory.PhiPhat, 0, false)]
    [InlineData(InvoiceLineCategory.PhiPhat, -1_000_000, false)]
    [InlineData(InvoiceLineCategory.DieuChinhKhac, 50_000, true)]
    [InlineData(InvoiceLineCategory.DieuChinhKhac, -50_000, true)]
    public void IsAmountAllowedOnSettlement_BoiThuongVaPhiPhatPhaiDuong(
        InvoiceLineCategory category, int amount, bool expected)
    {
        Assert.Equal(expected, InvoiceLine.IsAmountAllowedOnSettlement(category, amount));
    }

    /// <summary>
    /// FR-55, FR-58, FR-92: số dư dương — người thuê còn phải trả. Kỳ cuối 1.779.678 + công nợ tháng 11 1.420.000
    /// + bồi thường 300.000 + phí phạt 1.000.000 − tiền cọc 3.000.000 = 1.499.678.
    /// </summary>
    [Fact]
    public void Calculate_SoDuDuong_NguoiThueConPhaiTra()
    {
        var amounts = SettlementCalculator.Calculate(
            TenantShortNotice(),
            December1To15,
            Electricity,
            Water,
            [Debt(1_420_000)],
            [Damage(300_000), Penalty(1_000_000)]).Amounts;

        Assert.Equal(new SettlementInvoiceAmounts(
            RentAmount: 1_451_613,
            ElectricityAmount: 210_000,
            WaterAmount: 60_000,
            ServiceFeeAmount: 58_065,
            LinesAmount: -280_000,
            TotalAmount: 1_499_678), amounts);
        Assert.Equal(1_499_678m, amounts.AmountDueFromTenant);
        Assert.Equal(0m, amounts.DepositRefundAmount);
    }

    /// <summary>
    /// FR-58, FR-86: số dư âm — Chủ trọ hoàn phần cọc dư, số tiền hoàn do hệ thống tính. Kỳ cuối 1.779.678
    /// + bồi thường 300.000 − tiền cọc 3.000.000 = −920.322, hoàn 920.322.
    /// </summary>
    [Fact]
    public void Calculate_SoDuAm_ChuTroHoanPhanCocDu()
    {
        var amounts = SettlementCalculator.Calculate(
            NewContract(),
            December1To15,
            Electricity,
            Water,
            [],
            [Damage(300_000)]).Amounts;

        Assert.Equal(-2_700_000m, amounts.LinesAmount);
        Assert.Equal(-920_322m, amounts.TotalAmount);
        Assert.Equal(0m, amounts.AmountDueFromTenant);
        Assert.Equal(920_322m, amounts.DepositRefundAmount);
    }

    /// <summary>
    /// FR-58: số dư bằng 0 — không bên nào phải trả. Tháng 12 đã có hóa đơn định kỳ nên chỉ tính điện nước 270.000;
    /// bồi thường 2.730.000 − tiền cọc 3.000.000 = −270.000.
    /// </summary>
    [Fact]
    public void Calculate_SoDuBang0_KhongBenNaoPhaiTra()
    {
        var amounts = SettlementCalculator.Calculate(
            NewContract(),
            MeterOnlyOn15December,
            Electricity,
            Water,
            [],
            [Damage(2_730_000)]).Amounts;

        Assert.Equal(0m, amounts.TotalAmount);
        Assert.Equal(0m, amounts.AmountDueFromTenant);
        Assert.Equal(0m, amounts.DepositRefundAmount);
    }

    // ---------------------------------------------------- Domain tự ghép dòng, trừ tiền cọc đúng một lần

    /// <summary>
    /// FR-55, RK-03: domain tự thêm dòng trừ tiền cọc — bên gọi chỉ đưa dòng công nợ và dòng Chủ trọ gửi — nên tổng luôn
    /// trừ cọc đúng một lần. Thứ tự dòng: công nợ kỳ trước, các khoản Chủ trọ gửi, cuối cùng là dòng trừ cọc; tổng các
    /// dòng khớp đúng danh sách được lưu.
    /// </summary>
    [Fact]
    public void Calculate_TuThemDongTruCocDungMotLan_ThuTuFR55()
    {
        var result = SettlementCalculator.Calculate(
            NewContract(), December1To15, Electricity, Water, [Debt(1_420_000)], [Damage(300_000)]);

        Assert.Collection(result.Lines,
            l => Assert.Equal(InvoiceLineCategory.CongNoKyTruoc, l.Category),
            l => Assert.Equal(InvoiceLineCategory.BoiThuongHuHong, l.Category),
            l => { Assert.Equal(InvoiceLineCategory.KhauTruTienCoc, l.Category); Assert.Equal(-3_000_000m, l.Amount); });
        Assert.Equal(result.Lines.Sum(l => l.Amount), result.Amounts.LinesAmount);
        Assert.Equal(-1_280_000m, result.Amounts.LinesAmount);
        Assert.Equal(499_678m, result.Amounts.TotalAmount);
    }

    /// <summary>api-design mục 10: hợp đồng không cọc thì không có dòng trừ tiền cọc.</summary>
    [Fact]
    public void Calculate_HopDongKhongCoc_KhongCoDongTruCoc()
    {
        var result = SettlementCalculator.Calculate(
            NewContract(depositAmount: 0), December1To15, Electricity, Water, [], [Damage(300_000)]);

        Assert.DoesNotContain(result.Lines, l => l.Category == InvoiceLineCategory.KhauTruTienCoc);
        Assert.Equal(2_079_678m, result.Amounts.TotalAmount);
    }

    /// <summary>
    /// FR-55: dòng trừ cọc và dòng công nợ chỉ do hệ thống thêm. Đưa nhầm vào danh sách dòng Chủ trọ — trừ cọc hai lần
    /// — hoặc đưa dòng khác vào danh sách công nợ là lỗi lập trình.
    /// </summary>
    [Fact]
    public void Calculate_DongSaiDanhSach_NemLoi()
    {
        var depositLine = SettlementCalculator.DepositDeductionLine(NewContract())!;

        Assert.Throws<ArgumentException>(() => SettlementCalculator.Calculate(
            NewContract(), December1To15, Electricity, Water, [], [Damage(300_000), depositLine]));
        Assert.Throws<ArgumentException>(() => SettlementCalculator.Calculate(
            NewContract(), December1To15, Electricity, Water, [], [Debt(1_420_000)]));
        Assert.Throws<ArgumentException>(() => SettlementCalculator.Calculate(
            NewContract(), December1To15, Electricity, Water, [Damage(300_000)], []));
    }

    // ---------------------------------------------------- Số tiền phải vừa cột tiền numeric(14,2)

    /// <summary>database-design mục 1: cột tiền numeric(14,2) chứa tới 999.999.999.999,99, cả số âm.</summary>
    [Fact]
    public void MoneyLimits_Fits_TheoCotNumeric14Va2()
    {
        Assert.True(MoneyLimits.Fits(999_999_999_999.99m));
        Assert.True(MoneyLimits.Fits(-999_999_999_999.99m));
        Assert.False(MoneyLimits.Fits(1_000_000_000_000m));
        Assert.False(MoneyLimits.Fits(-1_000_000_000_000m));
    }

    [Fact]
    public void Calculate_ViDuApiDesign_VuaCotTien()
    {
        Assert.True(SettlementCalculator.Calculate(
            NewContract(), December1To15, Electricity, Water, [Debt(1_420_000)], [Damage(300_000)]).Amounts.FitsMoneyColumns);
    }

    /// <summary>
    /// Hai dòng bồi thường 999.999.999.999 — mỗi dòng đều vừa cột — nhưng tổng 1.779.678 + 1.999.999.999.998
    /// − 3.000.000 = 1.999.998.779.676 thì vượt. Service trả 422, không để database báo tràn số.
    /// </summary>
    [Fact]
    public void Calculate_TongDuongVuotCotTien_KhongVuaCot()
    {
        var amounts = SettlementCalculator.Calculate(
            NewContract(), December1To15, Electricity, Water, [],
            [Damage(999_999_999_999), Damage(999_999_999_999)]).Amounts;

        Assert.Equal(1_999_998_779_676m, amounts.TotalAmount);
        Assert.False(amounts.FitsMoneyColumns);
    }

    /// <summary>Dòng điều chỉnh nhận số âm, nên tổng cũng có thể vượt cột về phía âm.</summary>
    [Fact]
    public void Calculate_TongAmVuotCotTien_KhongVuaCot()
    {
        var adjustment = Line(InvoiceLineCategory.DieuChinhKhac, -999_999_999_999, "Giảm trừ");

        var amounts = SettlementCalculator.Calculate(
            NewContract(), December1To15, Electricity, Water, [], [adjustment, adjustment]).Amounts;

        Assert.True(amounts.TotalAmount < -MoneyLimits.MaxAmount);
        Assert.False(amounts.FitsMoneyColumns);
    }

    /// <summary>
    /// Chỉ số điện 0 → 9.999.999.999,99 vừa cột chỉ số numeric(12,2), nhưng tiền điện × 3.500 = 34.999.999.999.965 vượt
    /// cột tiền. Mọi khoản được lưu đều phải vừa cột, không chỉ tổng — ở đây một dòng điều chỉnh âm kéo tổng về −1.940.035.
    /// </summary>
    [Fact]
    public void Calculate_TienDienVuotCotDuTongVuaCot_KhongVuaCot()
    {
        var adjustment = Line(InvoiceLineCategory.DieuChinhKhac, -34_999_999_000_000, "Giảm trừ");

        var amounts = SettlementCalculator.Calculate(
            NewContract(), MeterOnlyOn15December, new MeterReading(0, 9_999_999_999.99m), Water, [], [adjustment]).Amounts;

        Assert.Equal(34_999_999_999_965m, amounts.ElectricityAmount);
        Assert.Equal(-1_940_035m, amounts.TotalAmount);
        Assert.False(amounts.FitsMoneyColumns);
    }
}
