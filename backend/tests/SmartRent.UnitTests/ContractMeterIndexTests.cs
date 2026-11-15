using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

/// <summary>
/// Chỉ số cũ của hóa đơn kế tiếp — BR-14, FR-38, api-design mục 9. Hợp đồng bắt đầu 15/10/2026, chỉ số lúc bàn giao
/// điện 1.180, nước 76.
/// </summary>
public class ContractMeterIndexTests
{
    private static Contract NewContract() => new()
    {
        Id = 1,
        StartDate = new DateOnly(2026, 10, 15),
        EndDate = new DateOnly(2027, 10, 14),
        Status = ContractStatus.DangHieuLuc,
        InitialElectricityIndex = 1_180m,
        InitialWaterIndex = 76m
    };

    private static Invoice NewInvoice(
        long id,
        InvoiceType type,
        DateOnly periodStart,
        DateOnly periodEnd,
        decimal currentElectricity,
        decimal currentWater,
        InvoiceStatus status) => new()
    {
        Id = id,
        ContractId = 1,
        Type = type,
        PeriodStart = periodStart,
        PeriodEnd = periodEnd,
        CurrentElectricityIndex = currentElectricity,
        CurrentWaterIndex = currentWater,
        Status = status
    };

    /// <summary>Hóa đơn tháng 10: 15/10 – 31/10, điện 1.250, nước 84,5, đã thanh toán.</summary>
    private static Invoice October(long id = 1, InvoiceStatus status = InvoiceStatus.DaThanhToan)
        => NewInvoice(id, InvoiceType.DinhKy, new(2026, 10, 15), new(2026, 10, 31), 1_250m, 84.5m, status);

    /// <summary>Hóa đơn tháng 11: 01/11 – 30/11.</summary>
    private static Invoice November(long id, decimal electricity, decimal water, InvoiceStatus status)
        => NewInvoice(id, InvoiceType.DinhKy, new(2026, 11, 1), new(2026, 11, 30), electricity, water, status);

    /// <summary>Kỳ đầu tiên: chưa có hóa đơn nào thì lấy chỉ số lúc bàn giao ghi trong hợp đồng.</summary>
    [Fact]
    public void LatestMeterIndexes_ChuaCoHoaDon_ChiSoDauCuaHopDong()
    {
        Assert.Equal((1_180m, 76m), NewContract().LatestMeterIndexes([]));
    }

    /// <summary>Hóa đơn tháng 10 đã hủy, chưa lập lại: kỳ kế tiếp vẫn là kỳ đầu tiên, chỉ số cũ là chỉ số đầu.</summary>
    [Fact]
    public void LatestMeterIndexes_ChiCoHoaDonDaHuy_ChiSoDauCuaHopDong()
    {
        var invoices = new[] { October(status: InvoiceStatus.DaHuy) };

        Assert.Equal((1_180m, 76m), NewContract().LatestMeterIndexes(invoices));
    }

    /// <summary>
    /// Tháng 10 (điện 1.250) đã thanh toán, tháng 11 (điện 1.390, nước 91) chưa thanh toán: chỉ số cũ của tháng 12 là
    /// chỉ số mới của tháng 11, không phụ thuộc thứ tự các hóa đơn được truyền vào.
    /// </summary>
    [Fact]
    public void LatestMeterIndexes_NhieuHoaDon_ChiSoMoiCuaKyGanNhat()
    {
        var invoices = new[] { November(2, 1_390m, 91m, InvoiceStatus.ChuaThanhToan), October() };

        Assert.Equal((1_390m, 91m), NewContract().LatestMeterIndexes(invoices));
    }

    /// <summary>
    /// Tháng 11 lập với điện 1.400 rồi bị hủy vì ghi sai: kỳ liền trước bỏ qua hóa đơn Đã hủy, chỉ số cũ để lập lại tháng
    /// 11 là chỉ số mới của tháng 10 (BR-14).
    /// </summary>
    [Fact]
    public void LatestMeterIndexes_HoaDonGanNhatDaHuy_LayHoaDonChuaHuyTruocDo()
    {
        var invoices = new[] { October(), November(2, 1_400m, 92m, InvoiceStatus.DaHuy) };

        Assert.Equal((1_250m, 84.5m), NewContract().LatestMeterIndexes(invoices));
    }

    /// <summary>
    /// Tháng 11 bị hủy (điện 1.400) rồi lập lại (điện 1.390, đang Nháp): hóa đơn đã hủy xen giữa không được chọn dù cùng
    /// kỳ và chỉ số cao hơn.
    /// </summary>
    [Fact]
    public void LatestMeterIndexes_HoaDonDaHuyXenGiua_LayHoaDonLapLai()
    {
        var invoices = new[]
        {
            October(),
            November(2, 1_400m, 92m, InvoiceStatus.DaHuy),
            November(3, 1_390m, 91m, InvoiceStatus.Nhap)
        };

        Assert.Equal((1_390m, 91m), NewContract().LatestMeterIndexes(invoices));
    }

    /// <summary>
    /// Tháng 10 đã có hóa đơn, người thuê trả phòng 15/11: hóa đơn thanh lý 01/11 – 15/11 mang chỉ số lúc trả phòng
    /// (điện 1.320, nước 88).
    /// </summary>
    [Fact]
    public void LatestMeterIndexes_HoaDonThanhLySauHoaDonDinhKy_ChiSoLucTraPhong()
    {
        var invoices = new[]
        {
            October(),
            NewInvoice(2, InvoiceType.ThanhLy, new(2026, 11, 1), new(2026, 11, 15), 1_320m, 88m, InvoiceStatus.Nhap)
        };

        Assert.Equal((1_320m, 88m), NewContract().LatestMeterIndexes(invoices));
    }

    /// <summary>
    /// Hóa đơn tháng 11 (01/11 – 30/11, điện 1.390) lập ngày 26/11, người thuê trả phòng 28/11: hóa đơn thanh lý có kỳ
    /// 28/11 – 28/11 (FR-93) nằm trong tháng đã có hóa đơn định kỳ, ngày cuối kỳ sớm hơn, nhưng mang chỉ số lúc trả phòng
    /// (điện 1.402, nước 91,5) — lần chốt số cuối cùng của hợp đồng.
    /// </summary>
    [Fact]
    public void LatestMeterIndexes_HoaDonThanhLyTrongThangDaCoHoaDonDinhKy_ChiSoLucTraPhong()
    {
        var invoices = new[]
        {
            October(),
            November(2, 1_390m, 91m, InvoiceStatus.DaChuyenThanhLy),
            NewInvoice(3, InvoiceType.ThanhLy, new(2026, 11, 28), new(2026, 11, 28), 1_402m, 91.5m, InvoiceStatus.Nhap)
        };

        Assert.Equal((1_402m, 91.5m), NewContract().LatestMeterIndexes(invoices));
    }
}
