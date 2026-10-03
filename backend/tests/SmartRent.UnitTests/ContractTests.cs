using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

public class ContractTests
{
    private static readonly DateTimeOffset ApprovedAt = new(2026, 10, 1, 8, 0, 0, TimeSpan.Zero);

    private static Contract NewContract(ContractStatus status, decimal depositAmount = 3_000_000) => new()
    {
        Id = 1,
        TenantUserId = 20,
        Status = status,
        DepositAmount = depositAmount,
        StartDate = new DateOnly(2026, 10, 15),
        EndDate = new DateOnly(2027, 10, 14),
        RentalRequest = new RentalRequest
        {
            Status = RentalRequestStatus.DaLapHopDong,
            SubmittedAt = ApprovedAt.AddDays(-1),
            ProcessedAt = ApprovedAt
        }
    };

    [Fact]
    public void ConfirmByTenant_CocLonHon0_ChoNhanCoc()
    {
        var contract = NewContract(ContractStatus.ChoNguoiThueXacNhan);
        var now = ApprovedAt.AddHours(5);

        var activated = contract.ConfirmByTenant(now);

        Assert.False(activated);
        Assert.Equal(ContractStatus.ChoNhanCoc, contract.Status);
        Assert.Equal(now, contract.TenantConfirmedAt);
        Assert.Null(contract.ActivatedAt);
    }

    [Fact]
    public void ConfirmByTenant_CocBang0_HieuLucNgay()
    {
        var contract = NewContract(ContractStatus.ChoNguoiThueXacNhan, depositAmount: 0);
        var now = ApprovedAt.AddHours(5);

        var activated = contract.ConfirmByTenant(now);

        Assert.True(activated);
        Assert.Equal(ContractStatus.DangHieuLuc, contract.Status);
        Assert.Equal(now, contract.ActivatedAt);
    }

    [Fact]
    public void ConfirmDeposit_GhiNgayNhanThucTeVaKichHoat()
    {
        var contract = NewContract(ContractStatus.ChoNhanCoc);
        var receivedAt = ApprovedAt.AddHours(-30);
        var now = ApprovedAt.AddHours(6);

        contract.ConfirmDeposit(receivedAt, PaymentMethod.ChuyenKhoan, now);

        Assert.Equal(ContractStatus.DangHieuLuc, contract.Status);
        Assert.Equal(receivedAt, contract.DepositReceivedAt);
        Assert.Equal(PaymentMethod.ChuyenKhoan, contract.DepositReceivedMethod);
        Assert.Equal(now, contract.ActivatedAt);
    }

    [Fact]
    public void Recall_BoLanDongYTruocDo()
    {
        var contract = NewContract(ContractStatus.ChoNhanCoc);
        contract.TenantConfirmedAt = ApprovedAt.AddHours(2);

        contract.Recall();

        Assert.Equal(ContractStatus.Nhap, contract.Status);
        Assert.Null(contract.TenantConfirmedAt);
    }

    [Fact]
    public void HoldDeadline_ChiCoKhiChuaHieuLuc()
    {
        Assert.Equal(ApprovedAt.AddHours(72), NewContract(ContractStatus.Nhap).HoldDeadline);
        Assert.Null(NewContract(ContractStatus.DangHieuLuc).HoldDeadline);
    }

    [Fact]
    public void IsHoldExpired_QuaMoc72Gio()
    {
        var contract = NewContract(ContractStatus.ChoNguoiThueXacNhan);

        Assert.False(contract.IsHoldExpired(ApprovedAt.AddHours(72)));
        Assert.True(contract.IsHoldExpired(ApprovedAt.AddHours(72).AddSeconds(1)));
    }

    [Theory]
    [InlineData(ContractStatus.Nhap)]
    [InlineData(ContractStatus.ChoNguoiThueXacNhan)]
    [InlineData(ContractStatus.ChoNhanCoc)]
    public void CanBeCancelled_ChuaHieuLuc_LuonHuyDuoc(ContractStatus status)
    {
        var contract = NewContract(status);

        Assert.True(contract.CanBeCancelled(contract.StartDate.AddDays(3)));
    }

    [Fact]
    public void CanBeCancelled_DangHieuLuc_ChiTruocNgayBatDau()
    {
        var contract = NewContract(ContractStatus.DangHieuLuc);

        Assert.True(contract.CanBeCancelled(contract.StartDate.AddDays(-1)));
        Assert.False(contract.CanBeCancelled(contract.StartDate));
    }

    [Theory]
    [InlineData(ContractStatus.SapHetHan)]
    [InlineData(ContractStatus.DangThanhLy)]
    [InlineData(ContractStatus.DaThanhLy)]
    [InlineData(ContractStatus.DaHuy)]
    public void CanBeCancelled_TrangThaiKhac_KhongHuyDuoc(ContractStatus status)
    {
        var contract = NewContract(status);

        Assert.False(contract.CanBeCancelled(contract.StartDate.AddDays(-10)));
    }

    [Fact]
    public void IsAwaitingDepositRefund_DaHuyDaNhanCocChuaHoan()
    {
        var contract = NewContract(ContractStatus.ChoNhanCoc);
        contract.ConfirmDeposit(ApprovedAt, PaymentMethod.TienMat, ApprovedAt);
        contract.Cancel(contract.TenantUserId, "Đổi ý", ApprovedAt.AddDays(1));

        Assert.True(contract.IsAwaitingDepositRefund);
        Assert.True(contract.WasCancelledByTenant);

        contract.DepositRefundedAt = ApprovedAt.AddDays(2);

        Assert.False(contract.IsAwaitingDepositRefund);
    }

    [Fact]
    public void Cancel_HeThongHuy_KhongGhiBenHuy()
    {
        var contract = NewContract(ContractStatus.Nhap);

        contract.Cancel(null, "Hết hạn giữ chỗ", ApprovedAt.AddHours(73));

        Assert.Equal(ContractStatus.DaHuy, contract.Status);
        Assert.Null(contract.CancelledByUserId);
        Assert.False(contract.WasCancelledByTenant);
        Assert.False(contract.IsAwaitingDepositRefund);
    }
}
