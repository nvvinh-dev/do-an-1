using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

/// <summary>Hồ sơ ở ghép — BP-11, FR-105 đến FR-107, FR-117.</summary>
public class RoommateProfileTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 20, 3, 0, 0, TimeSpan.Zero);

    [Fact]
    public void CreateFor_HoSoMoiDangTimVaThuocNguoiThue()
    {
        var profile = RoommateProfile.CreateFor(42);

        Assert.Equal(42, profile.TenantUserId);
        Assert.True(profile.IsSearching);
    }

    // FR-107: chỉ hợp đồng Đang hiệu lực chặn; Sắp hết hạn, Đang thanh lý vẫn dùng được ở ghép.
    [Theory]
    [InlineData(ContractStatus.DangHieuLuc, true)]
    [InlineData(ContractStatus.SapHetHan, false)]
    [InlineData(ContractStatus.DangThanhLy, false)]
    [InlineData(ContractStatus.Nhap, false)]
    [InlineData(ContractStatus.ChoNguoiThueXacNhan, false)]
    [InlineData(ContractStatus.ChoNhanCoc, false)]
    [InlineData(ContractStatus.DaThanhLy, false)]
    [InlineData(ContractStatus.DaHuy, false)]
    public void BlocksRoommateFeatures_ChiHopDongDangHieuLuc(ContractStatus status, bool expected)
    {
        Assert.Equal(expected, RoommateProfile.BlocksRoommateFeatures(status));
    }

    // FR-117: xóa hồ sơ thì lời mời đang chờ chuyển Đã rút.
    [Fact]
    public void Withdraw_LoiMoiDangChoChuyenDaRut()
    {
        var invitation = NewInvitation(RoommateInvitationStatus.ChoPhanHoi);

        invitation.Withdraw(Now);

        Assert.Equal(RoommateInvitationStatus.DaRut, invitation.Status);
        Assert.Equal(Now, invitation.RespondedAt);
    }

    [Theory]
    [InlineData(RoommateInvitationStatus.DaChapNhan)]
    [InlineData(RoommateInvitationStatus.TuChoi)]
    [InlineData(RoommateInvitationStatus.DaRut)]
    public void Withdraw_LoiMoiKhongConChoThiBaoLoi(RoommateInvitationStatus status)
    {
        var invitation = NewInvitation(status);

        Assert.False(invitation.IsPending);
        Assert.Throws<InvalidOperationException>(() => invitation.Withdraw(Now));
        Assert.Equal(status, invitation.Status);
    }

    private static RoommateInvitation NewInvitation(RoommateInvitationStatus status) => new()
    {
        Id = 1,
        SenderUserId = 10,
        RecipientUserId = 20,
        Status = status,
        SentAt = Now.AddDays(-1)
    };
}
