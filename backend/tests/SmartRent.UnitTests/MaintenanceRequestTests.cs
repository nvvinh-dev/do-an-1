using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

/// <summary>Báo sự cố — BP-08, FR-136, FR-137.</summary>
public class MaintenanceRequestTests
{
    private static readonly DateOnly StartDate = new(2026, 10, 15);
    private static readonly DateOnly EndDate = new(2027, 10, 14);

    private static Contract NewContract(ContractStatus status, DateOnly? expectedMoveOutDate = null) => new()
    {
        Id = 1,
        TenantUserId = 20,
        Status = status,
        StartDate = StartDate,
        EndDate = EndDate,
        ExpectedMoveOutDate = expectedMoveOutDate
    };

    [Theory]
    [InlineData(ContractStatus.DangHieuLuc, 0, true)]
    [InlineData(ContractStatus.DangHieuLuc, 100, true)]
    [InlineData(ContractStatus.DangHieuLuc, -1, false)]
    [InlineData(ContractStatus.SapHetHan, 360, true)]
    [InlineData(ContractStatus.Nhap, 10, false)]
    [InlineData(ContractStatus.ChoNguoiThueXacNhan, 10, false)]
    [InlineData(ContractStatus.ChoNhanCoc, 10, false)]
    [InlineData(ContractStatus.DaThanhLy, 10, false)]
    [InlineData(ContractStatus.DaHuy, 10, false)]
    public void CanReportMaintenance_DangHieuLucHoacSapHetHanDaToiNgayBatDau(
        ContractStatus status, int daysAfterStart, bool expected)
    {
        Assert.Equal(expected, NewContract(status).CanReportMaintenance(StartDate.AddDays(daysAfterStart)));
    }

    [Theory]
    [InlineData("2026-11-20", true)]   // trước ngày trả phòng dự kiến 30/11
    [InlineData("2026-11-30", true)]   // đúng ngày trả phòng: người thuê còn ở
    [InlineData("2026-12-01", false)]  // đã qua ngày trả phòng: hư hỏng ghi vào bảng thanh lý
    public void CanReportMaintenance_DangThanhLyChiTruocKhiQuaNgayTraPhong(string today, bool expected)
    {
        var contract = NewContract(ContractStatus.DangThanhLy, new DateOnly(2026, 11, 30));

        Assert.Equal(expected, contract.CanReportMaintenance(DateOnly.Parse(today)));
    }

    [Fact]
    public void Report_TaoSuCoMoiVoiAnhTheoThuTu()
    {
        var now = new DateTimeOffset(2026, 11, 16, 9, 0, 0, TimeSpan.FromHours(7));

        var request = MaintenanceRequest.Report(
            contractId: 35,
            title: "Vòi sen bị rò nước",
            description: "Rò ở khớp nối.",
            urgency: MaintenanceUrgency.Gap,
            imagePaths: ["a.jpg", "b.jpg"],
            now: now);

        Assert.Equal(35, request.ContractId);
        Assert.Equal(MaintenanceRequestStatus.Moi, request.Status);
        Assert.Equal(MaintenanceUrgency.Gap, request.Urgency);
        Assert.Equal(now, request.CreatedAt);
        Assert.False(request.IsAutoClosed);
        Assert.Null(request.AcceptedAt);
        Assert.Equal(
            [("a.jpg", 0), ("b.jpg", 1)],
            request.Images.Select(i => (i.Url, i.DisplayOrder)).ToList());
    }

    [Fact]
    public void Report_KhongAnhVanTaoDuoc()
    {
        var request = MaintenanceRequest.Report(
            1, "Mất nước", "Cả phòng mất nước từ sáng.", MaintenanceUrgency.KhanCap, [], DateTimeOffset.UtcNow);

        Assert.Empty(request.Images);
    }
}
