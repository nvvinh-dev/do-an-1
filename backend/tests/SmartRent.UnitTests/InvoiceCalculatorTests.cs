using System.Globalization;
using SmartRent.Domain;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

/// <summary>
/// Công thức tiền của hóa đơn định kỳ — BR-12 tới BR-15, FR-39 tới FR-42 (RK-03: các quy tắc tiền phải có test tự động).
/// Số liệu chung: hợp đồng chốt giá thuê 3.000.000, điện 3.500/kWh, nước 15.000/m³, phí Rác 20.000 và Wifi 100.000.
/// </summary>
public class InvoiceCalculatorTests
{
    private static DateOnly D(int year, int month, int day) => new(year, month, day);

    /// <summary>
    /// Số thập phân trong InlineData viết dạng chuỗi có dấu chấm; đọc theo InvariantCulture để máy đặt
    /// định dạng số Việt Nam (dấu chấm là phân cách hàng nghìn) không đọc "1645161.29" thành 164.516.129.
    /// </summary>
    private static decimal M(string value) => decimal.Parse(value, CultureInfo.InvariantCulture);

    private static BillingPeriod October15To31 => BillingPeriod.First(D(2026, 10, 15));

    private static BillingPeriod November => new(D(2026, 11, 1), D(2026, 11, 30));

    /// <summary>
    /// Hợp đồng chốt giá thấp hơn giá hiện tại của phòng, để thấy hóa đơn lấy giá của hợp đồng (BR-12, BR-13, FR-40).
    /// </summary>
    private static Contract NewContract(bool withServiceFees = true) => new()
    {
        Id = 1,
        RentPrice = 3_000_000,
        ElectricityUnitPrice = 3_500,
        WaterUnitPrice = 15_000,
        StartDate = D(2026, 10, 15),
        EndDate = D(2027, 10, 14),
        Status = ContractStatus.DangHieuLuc,
        Room = new Room { RentPrice = 3_500_000, ElectricityUnitPrice = 4_000, WaterUnitPrice = 20_000 },
        ServiceFees = withServiceFees
            ?
            [
                new ContractServiceFee { Name = "Rác", Amount = 20_000 },
                new ContractServiceFee { Name = "Wifi", Amount = 100_000 }
            ]
            : []
    };

    private static InvoiceLine Adjustment(decimal amount) => new()
    {
        Category = InvoiceLineCategory.DieuChinhKhac,
        Description = "Điều chỉnh",
        Amount = amount
    };

    // ------------------------------------------------------------ Làm tròn

    /// <summary>database-design mục 1: làm tròn đến đồng, nửa đồng làm tròn ra xa số 0 — không làm tròn kiểu ngân hàng.</summary>
    [Theory]
    [InlineData("1645161.29", "1645161")]
    [InlineData("1370967.74", "1370968")]
    [InlineData("1099.89", "1100")]
    [InlineData("0.5", "1")]
    [InlineData("2.5", "3")]
    [InlineData("-2.5", "-3")]
    public void RoundToDong_AwayFromZero(string amount, string expected)
    {
        Assert.Equal(M(expected), InvoiceCalculator.RoundToDong(M(amount)));
    }

    // ------------------------------------------------- Tiền phòng theo tỷ lệ ngày

    /// <summary>BR-15, FR-42, api-design mục 9: ví dụ chuẩn — vào ở 15/10, 3.000.000 × 17 ÷ 31 = 1.645.161.</summary>
    [Fact]
    public void Prorate_ViDuChuan_VaoO15Thang10()
    {
        Assert.Equal(1_645_161m, InvoiceCalculator.Prorate(3_000_000, October15To31));
    }

    /// <summary>BR-15: kỳ trọn tháng ra đúng giá tháng.</summary>
    [Fact]
    public void Prorate_TronThang_DungGiaThang()
    {
        Assert.Equal(3_000_000m, InvoiceCalculator.Prorate(3_000_000, November));
    }

    /// <summary>BR-15, FR-42: kỳ cuối không trọn tháng, trả phòng 10/11 — 3.000.000 × 10 ÷ 30 = 1.000.000.</summary>
    [Fact]
    public void Prorate_KyCuoi_TraPhong10Thang11()
    {
        var period = new BillingPeriod(D(2026, 11, 1), D(2026, 11, 10));

        Assert.Equal(1_000_000m, InvoiceCalculator.Prorate(3_000_000, period));
    }

    /// <summary>BR-15: 2.500.000 × 17 ÷ 31 = 1.370.967,74 → làm tròn lên 1.370.968.</summary>
    [Fact]
    public void Prorate_LamTronLen()
    {
        Assert.Equal(1_370_968m, InvoiceCalculator.Prorate(2_500_000, October15To31));
    }

    /// <summary>BR-15: tháng 2/2027 có 28 ngày — ở 14 ngày, 3.000.000 × 14 ÷ 28 = 1.500.000.</summary>
    [Fact]
    public void Prorate_Thang2KhongNhuan()
    {
        var period = new BillingPeriod(D(2027, 2, 1), D(2027, 2, 14));

        Assert.Equal(1_500_000m, InvoiceCalculator.Prorate(3_000_000, period));
    }

    /// <summary>BR-15: tháng 2/2028 có 29 ngày — vào ở 10/02, 3.000.000 × 20 ÷ 29 = 2.068.965,52 → 2.068.966.</summary>
    [Fact]
    public void Prorate_Thang2NamNhuan()
    {
        Assert.Equal(2_068_966m, InvoiceCalculator.Prorate(3_000_000, BillingPeriod.First(D(2028, 2, 10))));
    }

    /// <summary>BR-15: ở đúng một ngày — 3.000.000 × 1 ÷ 31 = 96.774,19 → 96.774.</summary>
    [Fact]
    public void Prorate_MotNgay()
    {
        var period = new BillingPeriod(D(2026, 10, 15), D(2026, 10, 15));

        Assert.Equal(96_774m, InvoiceCalculator.Prorate(3_000_000, period));
    }

    /// <summary>BR-15, database-design mục 1: 1.500.015 × 1 ÷ 30 = 50.000,5 → 50.001, không phải 50.000.</summary>
    [Fact]
    public void Prorate_NuaDong_LamTronRaXaSo0()
    {
        Assert.Equal(50_001m, InvoiceCalculator.Prorate(1_500_015, BillingPeriod.First(D(2026, 11, 30))));
    }

    // ------------------------------------------------------- Tiền điện, nước

    /// <summary>BR-14: (1.250 − 1.200) × 3.500 = 175.000.</summary>
    [Fact]
    public void MeterAmount_Dien50So()
    {
        Assert.Equal(175_000m, InvoiceCalculator.MeterAmount(new MeterReading(1_200, 1_250), 3_500));
    }

    /// <summary>BR-14: chỉ số có phần lẻ — (84,5 − 80) × 15.000 = 67.500.</summary>
    [Fact]
    public void MeterAmount_Nuoc4Phay5Khoi()
    {
        Assert.Equal(67_500m, InvoiceCalculator.MeterAmount(new MeterReading(80, 84.5m), 15_000));
    }

    /// <summary>BR-14, database-design mục 1: (100,33 − 100) × 3.333 = 1.099,89 → 1.100.</summary>
    [Fact]
    public void MeterAmount_LamTronDenDong()
    {
        Assert.Equal(1_100m, InvoiceCalculator.MeterAmount(new MeterReading(100, 100.33m), 3_333));
    }

    /// <summary>BR-14: không dùng điện trong kỳ thì tiền điện bằng 0.</summary>
    [Fact]
    public void MeterAmount_KhongDung_Bang0()
    {
        Assert.Equal(0m, InvoiceCalculator.MeterAmount(new MeterReading(1_250, 1_250), 3_500));
    }

    /// <summary>BR-14, FR-39: chỉ số mới nhỏ hơn chỉ số cũ thì không hợp lệ; bằng thì hợp lệ.</summary>
    [Theory]
    [InlineData("1250", "1249.9", false)]
    [InlineData("1250", "1250", true)]
    [InlineData("1250", "1300", true)]
    public void MeterReading_IsValid(string previous, string current, bool expected)
    {
        Assert.Equal(expected, new MeterReading(M(previous), M(current)).IsValid);
    }

    /// <summary>BR-14, FR-39: tính tiền với chỉ số mới nhỏ hơn chỉ số cũ là lỗi lập trình — service phải chặn trước (422).</summary>
    [Fact]
    public void MeterAmount_ChiSoMoiNhoHonCu_NemLoi()
    {
        Assert.Throws<ArgumentException>(() => InvoiceCalculator.MeterAmount(new MeterReading(1_250, 1_249), 3_500));
    }

    // ------------------------------------------------------ Tổng hóa đơn định kỳ

    /// <summary>
    /// BR-15, FR-40, FR-41, FR-42: kỳ đầu 15/10–31/10 (17/31 ngày).
    /// Tiền phòng 1.645.161; điện 50 số × 3.500 = 175.000; nước 4,5 khối × 15.000 = 67.500;
    /// phí dịch vụ (20.000 + 100.000) × 17 ÷ 31 = 65.806,45 → 65.806; tổng 1.953.467.
    /// </summary>
    [Fact]
    public void CalculatePeriodic_KyDauKhongTronThang()
    {
        var amounts = InvoiceCalculator.CalculatePeriodic(
            NewContract(),
            October15To31,
            new MeterReading(1_200, 1_250),
            new MeterReading(80, 84.5m),
            []);

        Assert.Equal(new PeriodicInvoiceAmounts(
            RentAmount: 1_645_161,
            ElectricityAmount: 175_000,
            WaterAmount: 67_500,
            ServiceFeeAmount: 65_806,
            AdjustmentAmount: 0,
            TotalAmount: 1_953_467), amounts);
    }

    /// <summary>
    /// BR-15, FR-42: phí dịch vụ tính theo tỷ lệ trên tổng phí tháng rồi mới làm tròn một lần —
    /// 120.000 × 17 ÷ 31 = 65.806, không cộng từng khoản đã làm tròn (10.968 + 54.839 = 65.807).
    /// </summary>
    [Fact]
    public void CalculatePeriodic_PhiDichVu_TinhTrenTongPhiRoiLamTron()
    {
        var amounts = InvoiceCalculator.CalculatePeriodic(
            NewContract(),
            October15To31,
            new MeterReading(1_250, 1_250),
            new MeterReading(84.5m, 84.5m),
            []);

        Assert.Equal(65_806m, amounts.ServiceFeeAmount);
    }

    /// <summary>
    /// BR-12, BR-13, FR-40: giá lấy từ hợp đồng (3.000.000; 3.500; 15.000), không lấy giá hiện tại của phòng
    /// (3.500.000; 4.000; 20.000).
    /// </summary>
    [Fact]
    public void CalculatePeriodic_DungGiaHopDong_KhongDungGiaPhong()
    {
        var amounts = InvoiceCalculator.CalculatePeriodic(
            NewContract(withServiceFees: false),
            November,
            new MeterReading(1_250, 1_260),
            new MeterReading(84.5m, 85.5m),
            []);

        Assert.Equal(3_000_000m, amounts.RentAmount);
        Assert.Equal(35_000m, amounts.ElectricityAmount);
        Assert.Equal(15_000m, amounts.WaterAmount);
    }

    /// <summary>
    /// FR-41, BR-16: tháng 11 trọn tháng, có một dòng Điều chỉnh −70.000 cho sai sót của kỳ trước.
    /// 3.000.000 + điện 80 số 280.000 + nước 5,5 khối 82.500 + phí 120.000 − 70.000 = 3.412.500.
    /// </summary>
    [Fact]
    public void CalculatePeriodic_TronThang_CoDongDieuChinh()
    {
        var amounts = InvoiceCalculator.CalculatePeriodic(
            NewContract(),
            November,
            new MeterReading(1_250, 1_330),
            new MeterReading(84.5m, 90),
            [Adjustment(-70_000)]);

        Assert.Equal(new PeriodicInvoiceAmounts(
            RentAmount: 3_000_000,
            ElectricityAmount: 280_000,
            WaterAmount: 82_500,
            ServiceFeeAmount: 120_000,
            AdjustmentAmount: -70_000,
            TotalAmount: 3_412_500), amounts);
    }

    /// <summary>FR-41: nhiều dòng Điều chỉnh được cộng dồn — +50.000 và −20.000 thành +30.000.</summary>
    [Fact]
    public void CalculatePeriodic_NhieuDongDieuChinh_CongDon()
    {
        var amounts = InvoiceCalculator.CalculatePeriodic(
            NewContract(withServiceFees: false),
            November,
            new MeterReading(1_330, 1_330),
            new MeterReading(90, 90),
            [Adjustment(50_000), Adjustment(-20_000)]);

        Assert.Equal(30_000m, amounts.AdjustmentAmount);
        Assert.Equal(3_030_000m, amounts.TotalAmount);
    }

    /// <summary>FR-41: hợp đồng không có phí dịch vụ thì phí dịch vụ bằng 0.</summary>
    [Fact]
    public void CalculatePeriodic_KhongCoPhiDichVu()
    {
        var amounts = InvoiceCalculator.CalculatePeriodic(
            NewContract(withServiceFees: false),
            October15To31,
            new MeterReading(1_200, 1_200),
            new MeterReading(80, 80),
            []);

        Assert.Equal(0m, amounts.ServiceFeeAmount);
        Assert.Equal(1_645_161m, amounts.TotalAmount);
    }

    /// <summary>
    /// FR-41: tổng hóa đơn định kỳ không được âm. Tháng 11 không dùng điện nước, không phí:
    /// 3.000.000 − 3.500.000 = −500.000 → không cho phép; điều chỉnh −3.000.000 → tổng 0 → cho phép.
    /// </summary>
    [Theory]
    [InlineData(-3_500_000, -500_000, false)]
    [InlineData(-3_000_000, 0, true)]
    [InlineData(-2_999_999, 1, true)]
    public void CalculatePeriodic_TongKhongDuocAm(decimal adjustment, decimal expectedTotal, bool expectedAllowed)
    {
        var amounts = InvoiceCalculator.CalculatePeriodic(
            NewContract(withServiceFees: false),
            November,
            new MeterReading(1_330, 1_330),
            new MeterReading(90, 90),
            [Adjustment(adjustment)]);

        Assert.Equal(expectedTotal, amounts.TotalAmount);
        Assert.Equal(expectedAllowed, amounts.IsTotalAllowed);
    }

    /// <summary>FR-41, database-design mục 6.2: hóa đơn định kỳ chỉ nhận dòng DieuChinhKhac.</summary>
    [Theory]
    [InlineData(InvoiceLineCategory.DieuChinhKhac, true)]
    [InlineData(InvoiceLineCategory.CongNoKyTruoc, false)]
    [InlineData(InvoiceLineCategory.BoiThuongHuHong, false)]
    [InlineData(InvoiceLineCategory.PhiPhat, false)]
    [InlineData(InvoiceLineCategory.KhauTruTienCoc, false)]
    public void InvoiceLine_HoaDonDinhKyChiNhanDieuChinhKhac(InvoiceLineCategory category, bool expected)
    {
        Assert.Equal(expected, InvoiceLine.IsAllowedOnPeriodicInvoice(category));
    }
}
