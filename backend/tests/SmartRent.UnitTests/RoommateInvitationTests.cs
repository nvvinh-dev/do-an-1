using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

/// <summary>Lời mời kết nối ở ghép — FR-115 đến FR-118.</summary>
public class RoommateInvitationTests
{
    private const long Sender = 10;
    private const long Recipient = 20;

    private static readonly DateTimeOffset Now = new(2026, 11, 21, 3, 0, 0, TimeSpan.Zero);

    private static RoommateInvitation Invitation(RoommateInvitationStatus status) => new()
    {
        Id = 1,
        SenderUserId = Sender,
        RecipientUserId = Recipient,
        Status = status,
        SentAt = Now.AddDays(-1)
    };

    [Fact]
    public void Send_TaoLoiMoiChoPhanHoi()
    {
        var invitation = RoommateInvitation.Send(Sender, Recipient, Now);

        Assert.Equal(Sender, invitation.SenderUserId);
        Assert.Equal(Recipient, invitation.RecipientUserId);
        Assert.Equal(RoommateInvitationStatus.ChoPhanHoi, invitation.Status);
        Assert.Equal(Now, invitation.SentAt);
        Assert.Null(invitation.RespondedAt);
        Assert.False(invitation.IsConnected);
    }

    [Fact]
    public void Send_ChoChinhMinhThiBaoLoi()
    {
        Assert.Throws<InvalidOperationException>(() => RoommateInvitation.Send(Sender, Sender, Now));
    }

    [Fact]
    public void Accept_LoiMoiDangChoThanhKetNoi()
    {
        var invitation = Invitation(RoommateInvitationStatus.ChoPhanHoi);

        invitation.Accept(Now);

        Assert.Equal(RoommateInvitationStatus.DaChapNhan, invitation.Status);
        Assert.Equal(Now, invitation.RespondedAt);
        Assert.True(invitation.IsConnected);
    }

    [Fact]
    public void Reject_LoiMoiDangChoChuyenTuChoi()
    {
        var invitation = Invitation(RoommateInvitationStatus.ChoPhanHoi);

        invitation.Reject(Now);

        Assert.Equal(RoommateInvitationStatus.TuChoi, invitation.Status);
        Assert.Equal(Now, invitation.RespondedAt);
        Assert.False(invitation.IsConnected);
    }

    // Vòng đời chỉ đi ra từ Chờ phản hồi: mọi chuyển tiếp từ trạng thái cuối đều bị chặn.
    [Theory]
    [InlineData(RoommateInvitationStatus.DaChapNhan)]
    [InlineData(RoommateInvitationStatus.TuChoi)]
    [InlineData(RoommateInvitationStatus.DaRut)]
    public void AcceptHoacReject_LoiMoiKhongConChoThiBaoLoi(RoommateInvitationStatus status)
    {
        var invitation = Invitation(status);

        Assert.Throws<InvalidOperationException>(() => invitation.Accept(Now));
        Assert.Throws<InvalidOperationException>(() => invitation.Reject(Now));
        Assert.Equal(status, invitation.Status);
        Assert.Null(invitation.RespondedAt);
    }

    [Fact]
    public void Involves_VaOtherPartyOf_NhinTuHaiPhia()
    {
        var invitation = Invitation(RoommateInvitationStatus.ChoPhanHoi);

        Assert.True(invitation.Involves(Sender));
        Assert.True(invitation.Involves(Recipient));
        Assert.False(invitation.Involves(99));
        Assert.Equal(Recipient, invitation.OtherPartyOf(Sender));
        Assert.Equal(Sender, invitation.OtherPartyOf(Recipient));
    }

    // FR-116, nhìn từ người muốn gửi lời mời mới cho bên kia của lời mời đã có:
    // - đang chờ hoặc đã kết nối theo bất kỳ chiều nào → chặn;
    // - bên kia đã từ chối lời mời của mình → chặn;
    // - mình từ chối lời mời của bên kia → không chặn (mình đổi ý được); lời mời đã rút → không chặn.
    [Theory]
    [InlineData(RoommateInvitationStatus.ChoPhanHoi, Sender, true)]
    [InlineData(RoommateInvitationStatus.ChoPhanHoi, Recipient, true)]
    [InlineData(RoommateInvitationStatus.DaChapNhan, Sender, true)]
    [InlineData(RoommateInvitationStatus.DaChapNhan, Recipient, true)]
    [InlineData(RoommateInvitationStatus.TuChoi, Sender, true)]
    [InlineData(RoommateInvitationStatus.TuChoi, Recipient, false)]
    [InlineData(RoommateInvitationStatus.DaRut, Sender, false)]
    [InlineData(RoommateInvitationStatus.DaRut, Recipient, false)]
    public void PreventsNewInvitationFrom_TheoFr116(
        RoommateInvitationStatus status, long newSender, bool expected)
    {
        Assert.Equal(expected, Invitation(status).PreventsNewInvitationFrom(newSender));
    }
}
