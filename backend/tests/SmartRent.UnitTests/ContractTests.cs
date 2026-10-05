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
        RentalRequestId = 5,
        RentalRequest = new RentalRequest
        {
            Id = 5,
            Status = RentalRequestStatus.DaLapHopDong,
            SubmittedAt = ApprovedAt.AddDays(-1),
            ProcessedAt = ApprovedAt
        }
    };

    /// <summary>Hợp đồng chờ nhận cọc đúng luồng: người thuê đã đồng ý.</summary>
    private static Contract AwaitingDeposit()
    {
        var contract = NewContract(ContractStatus.ChoNhanCoc);
        contract.TenantConfirmedAt = ApprovedAt.AddHours(2);
        return contract;
    }

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
    public void CanConfirmByTenant_ChiKhiChoNguoiThueXacNhanVaConHanGiuCho()
    {
        Assert.True(NewContract(ContractStatus.ChoNguoiThueXacNhan).CanConfirmByTenant(ApprovedAt.AddHours(72)));
        Assert.False(NewContract(ContractStatus.ChoNguoiThueXacNhan).CanConfirmByTenant(ApprovedAt.AddHours(73)));
        Assert.False(NewContract(ContractStatus.Nhap).CanConfirmByTenant(ApprovedAt.AddHours(5)));
        Assert.False(NewContract(ContractStatus.ChoNhanCoc).CanConfirmByTenant(ApprovedAt.AddHours(5)));
    }

    [Fact]
    public void ConfirmByTenant_HopDongConNhap_NemLoiVaGiuNguyen()
    {
        // Gọi khi chưa /send: bỏ qua bước gửi hợp đồng.
        var contract = NewContract(ContractStatus.Nhap);

        Assert.Throws<InvalidOperationException>(() => contract.ConfirmByTenant(ApprovedAt.AddHours(5)));
        Assert.Equal(ContractStatus.Nhap, contract.Status);
        Assert.Null(contract.TenantConfirmedAt);
    }

    [Fact]
    public void CanConfirmDeposit_CanNguoiThueDaDongYVaConHanGiuCho()
    {
        Assert.True(AwaitingDeposit().CanConfirmDeposit(ApprovedAt.AddHours(72)));
        Assert.False(AwaitingDeposit().CanConfirmDeposit(ApprovedAt.AddHours(73)));
        Assert.False(NewContract(ContractStatus.ChoNhanCoc).CanConfirmDeposit(ApprovedAt.AddHours(5)));
        Assert.False(NewContract(ContractStatus.ChoNguoiThueXacNhan).CanConfirmDeposit(ApprovedAt.AddHours(5)));
    }

    [Fact]
    public void ConfirmDeposit_NguoiThueChuaDongY_NemLoiKhongKichHoat()
    {
        // BR-21, security-design 5.5: không được kích hoạt hợp đồng khi người thuê chưa đồng ý.
        var contract = NewContract(ContractStatus.ChoNguoiThueXacNhan);

        Assert.Throws<InvalidOperationException>(
            () => contract.ConfirmDeposit(ApprovedAt, PaymentMethod.TienMat, ApprovedAt.AddHours(5)));
        Assert.Equal(ContractStatus.ChoNguoiThueXacNhan, contract.Status);
        Assert.Null(contract.ActivatedAt);
        Assert.Null(contract.DepositReceivedAt);
    }

    [Fact]
    public void ConfirmDeposit_GhiNgayNhanThucTeVaKichHoat()
    {
        var contract = AwaitingDeposit();
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
        var contract = AwaitingDeposit();

        contract.Recall(ApprovedAt.AddHours(10));

        Assert.Equal(ContractStatus.Nhap, contract.Status);
        Assert.Null(contract.TenantConfirmedAt);
    }

    [Theory]
    [InlineData(ContractStatus.ChoNguoiThueXacNhan, 72, true)]
    [InlineData(ContractStatus.ChoNhanCoc, 72, true)]
    [InlineData(ContractStatus.ChoNguoiThueXacNhan, 73, false)]
    [InlineData(ContractStatus.Nhap, 5, false)]
    [InlineData(ContractStatus.DangHieuLuc, 5, false)]
    public void CanRecall_ChiHopDongDaGuiChuaHieuLucConHanGiuCho(ContractStatus status, int hoursAfterApproval, bool expected)
    {
        Assert.Equal(expected, NewContract(status).CanRecall(ApprovedAt.AddHours(hoursAfterApproval)));
    }

    [Fact]
    public void Recall_HopDongDangHieuLuc_NemLoiVaGiuNguyen()
    {
        var contract = NewContract(ContractStatus.DangHieuLuc);

        Assert.Throws<InvalidOperationException>(() => contract.Recall(ApprovedAt.AddDays(10)));
        Assert.Equal(ContractStatus.DangHieuLuc, contract.Status);
    }

    [Fact]
    public void HoldDeadline_ChiCoKhiChuaHieuLuc()
    {
        Assert.Equal(ApprovedAt.AddHours(72), NewContract(ContractStatus.Nhap).HoldDeadline);
        Assert.Null(NewContract(ContractStatus.DangHieuLuc).HoldDeadline);
    }

    [Fact]
    public void HoldDeadline_QuenNapRentalRequest_NemLoi()
    {
        var contract = NewContract(ContractStatus.ChoNguoiThueXacNhan);
        contract.RentalRequest = null;

        Assert.Throws<InvalidOperationException>(() => contract.HoldDeadline);
        Assert.Throws<InvalidOperationException>(() => contract.IsHoldExpired(ApprovedAt.AddHours(80)));
    }

    [Fact]
    public void HoldDeadline_KhongNapRentalRequest_HopDongDaHieuLuc_KhongCanHan()
    {
        var contract = NewContract(ContractStatus.DangHieuLuc);
        contract.RentalRequest = null;

        Assert.Null(contract.HoldDeadline);
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
    public void Cancel_HopDongDaBatDau_NemLoiVaGiuNguyen()
    {
        var contract = NewContract(ContractStatus.DangHieuLuc);
        var onStartDate = new DateTimeOffset(contract.StartDate.ToDateTime(new TimeOnly(9, 0)), TimeSpan.FromHours(7));

        Assert.Throws<InvalidOperationException>(() => contract.Cancel(contract.TenantUserId, "Đổi ý", onStartDate));
        Assert.Equal(ContractStatus.DangHieuLuc, contract.Status);
    }

    [Fact]
    public void IsAwaitingDepositRefund_DaHuyDaNhanCocChuaHoan()
    {
        var contract = NewContract(ContractStatus.ChoNguoiThueXacNhan);
        contract.ConfirmByTenant(ApprovedAt.AddHours(1));
        contract.ConfirmDeposit(ApprovedAt, PaymentMethod.TienMat, ApprovedAt.AddHours(2));
        contract.Cancel(contract.TenantUserId, "Đổi ý", ApprovedAt.AddDays(1));

        Assert.True(contract.IsAwaitingDepositRefund);
        Assert.True(contract.WasCancelledByTenant);

        contract.DepositRefundedAt = ApprovedAt.AddDays(2);

        Assert.False(contract.IsAwaitingDepositRefund);
    }

    [Theory]
    [InlineData(ContractStatus.DangHieuLuc, 15, true)]
    [InlineData(ContractStatus.DangHieuLuc, 0, true)]
    [InlineData(ContractStatus.DangHieuLuc, 16, false)]
    [InlineData(ContractStatus.DangThanhLy, 10, false)]
    [InlineData(ContractStatus.SapHetHan, 10, false)]
    public void ShouldMarkExpiringSoon_DangHieuLucConTu15NgayTroXuong(ContractStatus status, int daysBeforeEnd, bool expected)
    {
        var contract = NewContract(status);

        Assert.Equal(expected, contract.ShouldMarkExpiringSoon(contract.EndDate.AddDays(-daysBeforeEnd)));
    }

    [Fact]
    public void MarkExpiringSoon_ChuyenSapHetHan()
    {
        var contract = NewContract(ContractStatus.DangHieuLuc);

        contract.MarkExpiringSoon(contract.EndDate.AddDays(-15));

        Assert.Equal(ContractStatus.SapHetHan, contract.Status);
    }

    [Fact]
    public void MarkExpiringSoon_HopDongDangThanhLy_NemLoiVaGiuNguyen()
    {
        var contract = NewContract(ContractStatus.DangThanhLy);

        Assert.Throws<InvalidOperationException>(() => contract.MarkExpiringSoon(contract.EndDate.AddDays(-5)));
        Assert.Equal(ContractStatus.DangThanhLy, contract.Status);
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
