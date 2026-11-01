using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

public class RentalRequestTests
{
    private static readonly DateTimeOffset SubmittedAt = new(2026, 10, 1, 8, 0, 0, TimeSpan.Zero);

    /// <summary>Duyệt sau 2 ngày chờ: 03/10 08:00 UTC, hạn giữ chỗ 06/10 08:00 UTC.</summary>
    private static readonly DateTimeOffset ApprovedAt = SubmittedAt.AddDays(2);

    [Fact]
    public void IsAwaitingReview_DungMoc168Gio_VanConHan()
    {
        var request = new RentalRequest { Status = RentalRequestStatus.ChoDuyet, SubmittedAt = SubmittedAt };

        Assert.True(request.IsAwaitingReview(SubmittedAt.AddHours(168)));
    }

    [Fact]
    public void IsAwaitingReview_QuaMoc168Gio_HetHanDuTacVuChuaChay()
    {
        var request = new RentalRequest { Status = RentalRequestStatus.ChoDuyet, SubmittedAt = SubmittedAt };

        Assert.False(request.IsAwaitingReview(SubmittedAt.AddHours(168).AddSeconds(1)));
    }

    [Fact]
    public void IsAwaitingReview_KhongOChoDuyet_False()
    {
        var request = new RentalRequest { Status = RentalRequestStatus.DaDuyet, SubmittedAt = SubmittedAt };

        Assert.False(request.IsAwaitingReview(SubmittedAt.AddHours(1)));
    }

    [Fact]
    public void IsHoldingRoom_TinhTuLucDuyet72Gio()
    {
        var approvedAt = SubmittedAt.AddDays(2);
        var request = new RentalRequest
        {
            Status = RentalRequestStatus.DaDuyet,
            SubmittedAt = SubmittedAt,
            ProcessedAt = approvedAt
        };

        Assert.Equal(approvedAt.AddHours(72), request.HoldDeadline);
        Assert.True(request.IsHoldingRoom(approvedAt.AddHours(72)));
        Assert.False(request.IsHoldingRoom(approvedAt.AddHours(72).AddSeconds(1)));
    }

    [Fact]
    public void IsHoldingRoom_DaLapHopDong_False()
    {
        var request = new RentalRequest
        {
            Status = RentalRequestStatus.DaLapHopDong,
            SubmittedAt = SubmittedAt,
            ProcessedAt = SubmittedAt
        };

        Assert.False(request.IsHoldingRoom(SubmittedAt.AddHours(1)));
    }

    private static RentalRequest Pending() => new()
    {
        Id = 1,
        Status = RentalRequestStatus.ChoDuyet,
        SubmittedAt = SubmittedAt
    };

    private static RentalRequest Approved() => new()
    {
        Id = 1,
        Status = RentalRequestStatus.DaDuyet,
        SubmittedAt = SubmittedAt,
        ProcessedAt = ApprovedAt
    };

    [Fact]
    public void Approve_ChoDuyetConHan_DaDuyetVaBatDauGiuCho()
    {
        var request = Pending();
        var now = SubmittedAt.AddHours(30);

        request.Approve(now);

        Assert.Equal(RentalRequestStatus.DaDuyet, request.Status);
        Assert.Equal(now, request.ProcessedAt);
        Assert.Equal(now.AddHours(72), request.HoldDeadline);
    }

    [Fact]
    public void Approve_QuaHan168GioMaTacVuChuaChay_NemLoiVaGiuNguyen()
    {
        var request = Pending();

        Assert.False(request.CanApprove(SubmittedAt.AddHours(168).AddSeconds(1)));
        Assert.Throws<InvalidOperationException>(() => request.Approve(SubmittedAt.AddHours(168).AddSeconds(1)));
        Assert.Equal(RentalRequestStatus.ChoDuyet, request.Status);
        Assert.Null(request.ProcessedAt);
    }

    [Theory]
    [InlineData(RentalRequestStatus.DaDuyet)]
    [InlineData(RentalRequestStatus.DaLapHopDong)]
    [InlineData(RentalRequestStatus.TuChoi)]
    [InlineData(RentalRequestStatus.DaHuy)]
    [InlineData(RentalRequestStatus.HetHan)]
    public void CanApprove_KhongOChoDuyet_False(RentalRequestStatus status)
    {
        var request = Pending();
        request.Status = status;

        Assert.False(request.CanApprove(SubmittedAt.AddHours(1)));
    }

    [Fact]
    public void Reject_ChoDuyet_TuChoiGhiLyDo_KhongPhaiHuyDuyet()
    {
        var request = Pending();
        var now = SubmittedAt.AddHours(10);

        var wasHoldingRoom = request.Reject("Phòng đang sửa chữa", now);

        Assert.False(wasHoldingRoom);
        Assert.Equal(RentalRequestStatus.TuChoi, request.Status);
        Assert.Equal("Phòng đang sửa chữa", request.RejectReason);
        Assert.Equal(now, request.ProcessedAt);
    }

    [Fact]
    public void Reject_DaDuyetConHanGiuCho_HuyDuyet()
    {
        var request = Approved();
        var now = ApprovedAt.AddHours(72);

        var wasHoldingRoom = request.Reject("Người thuê không liên lạc được", now);

        Assert.True(wasHoldingRoom);
        Assert.Equal(RentalRequestStatus.TuChoi, request.Status);
        Assert.Equal(now, request.ProcessedAt);
    }

    [Fact]
    public void Reject_DaDuyetQuaHanGiuCho_NemLoiVaGiuNguyen()
    {
        var request = Approved();
        var now = ApprovedAt.AddHours(72).AddSeconds(1);

        Assert.False(request.CanReject(now));
        Assert.Throws<InvalidOperationException>(() => request.Reject("Trễ hạn", now));
        Assert.Equal(RentalRequestStatus.DaDuyet, request.Status);
        Assert.Equal(ApprovedAt, request.ProcessedAt);
        Assert.Null(request.RejectReason);
    }

    [Theory]
    [InlineData(RentalRequestStatus.DaLapHopDong)]
    [InlineData(RentalRequestStatus.TuChoi)]
    [InlineData(RentalRequestStatus.DaHuy)]
    [InlineData(RentalRequestStatus.HetHan)]
    public void CanReject_DaKetThucHoacDaLapHopDong_False(RentalRequestStatus status)
    {
        var request = Approved();
        request.Status = status;

        Assert.False(request.CanReject(ApprovedAt.AddHours(1)));
    }

    [Fact]
    public void RejectForRoomTaken_ChoDuyet_TuChoiKemLyDo()
    {
        var request = Pending();
        var now = SubmittedAt.AddHours(3);

        request.RejectForRoomTaken("Phòng đã được duyệt cho người khác.", now);

        Assert.Equal(RentalRequestStatus.TuChoi, request.Status);
        Assert.Equal("Phòng đã được duyệt cho người khác.", request.RejectReason);
        Assert.Equal(now, request.ProcessedAt);
    }

    [Fact]
    public void RejectForRoomTaken_ChoDuyetQuaHanMaTacVuChuaChay_VanTuChoi()
    {
        // BR-06 từ chối mọi yêu cầu còn ChoDuyet của phòng, kể cả yêu cầu đã quá 168 giờ mà tác vụ chưa chuyển HetHan.
        var request = Pending();

        request.RejectForRoomTaken("Phòng đã được duyệt cho người khác.", SubmittedAt.AddHours(200));

        Assert.Equal(RentalRequestStatus.TuChoi, request.Status);
    }

    [Fact]
    public void RejectForRoomTaken_KhongOChoDuyet_NemLoiVaGiuNguyen()
    {
        var request = Approved();

        Assert.Throws<InvalidOperationException>(
            () => request.RejectForRoomTaken("Phòng đã được duyệt cho người khác.", ApprovedAt.AddHours(1)));
        Assert.Equal(RentalRequestStatus.DaDuyet, request.Status);
        Assert.Null(request.RejectReason);
    }

    [Fact]
    public void Withdraw_ChoDuyet_DaHuyKhongGiuPhong()
    {
        var request = Pending();

        var wasHoldingRoom = request.Withdraw(SubmittedAt.AddHours(1));

        Assert.False(wasHoldingRoom);
        Assert.Equal(RentalRequestStatus.DaHuy, request.Status);
        Assert.Null(request.ProcessedAt);
    }

    [Fact]
    public void Withdraw_DaDuyetConHanGiuCho_DaHuyVaTraPhong()
    {
        var request = Approved();

        var wasHoldingRoom = request.Withdraw(ApprovedAt.AddHours(10));

        Assert.True(wasHoldingRoom);
        Assert.Equal(RentalRequestStatus.DaHuy, request.Status);
        Assert.Equal(ApprovedAt, request.ProcessedAt);
    }

    [Fact]
    public void Withdraw_ChoDuyetQuaHan168Gio_NemLoiVaGiuNguyen()
    {
        var request = Pending();
        var now = SubmittedAt.AddHours(168).AddSeconds(1);

        Assert.False(request.CanWithdraw(now));
        Assert.Throws<InvalidOperationException>(() => request.Withdraw(now));
        Assert.Equal(RentalRequestStatus.ChoDuyet, request.Status);
    }

    [Theory]
    [InlineData(RentalRequestStatus.DaLapHopDong)]
    [InlineData(RentalRequestStatus.TuChoi)]
    [InlineData(RentalRequestStatus.DaHuy)]
    [InlineData(RentalRequestStatus.HetHan)]
    public void CanWithdraw_DaKetThucHoacDaLapHopDong_False(RentalRequestStatus status)
    {
        var request = Approved();
        request.Status = status;

        Assert.False(request.CanWithdraw(ApprovedAt.AddHours(1)));
    }

    [Theory]
    [InlineData(168 * 3600, false)]
    [InlineData(168 * 3600 + 1, true)]
    public void ShouldExpireUnreviewed_ChiSauMoc168Gio(int secondsAfterSubmit, bool expected)
    {
        Assert.Equal(expected, Pending().ShouldExpireUnreviewed(SubmittedAt.AddSeconds(secondsAfterSubmit)));
    }

    [Fact]
    public void ShouldExpireUnreviewed_KhongOChoDuyet_False()
    {
        Assert.False(Approved().ShouldExpireUnreviewed(SubmittedAt.AddDays(30)));
    }

    [Fact]
    public void ExpireUnreviewed_QuaHan_HetHan()
    {
        var request = Pending();

        request.ExpireUnreviewed(SubmittedAt.AddHours(169));

        Assert.Equal(RentalRequestStatus.HetHan, request.Status);
        Assert.Null(request.ProcessedAt);
    }

    [Fact]
    public void ExpireUnreviewed_ConHan_NemLoiVaGiuNguyen()
    {
        var request = Pending();

        Assert.Throws<InvalidOperationException>(() => request.ExpireUnreviewed(SubmittedAt.AddHours(168)));
        Assert.Equal(RentalRequestStatus.ChoDuyet, request.Status);
    }

    [Theory]
    [InlineData(72 * 3600, false)]
    [InlineData(72 * 3600 + 1, true)]
    public void ShouldExpireHold_ChiSauMoc72GioKeTuLucDuyet(int secondsAfterApproval, bool expected)
    {
        Assert.Equal(expected, Approved().ShouldExpireHold(ApprovedAt.AddSeconds(secondsAfterApproval)));
    }

    [Fact]
    public void ShouldExpireHold_DaLapHopDong_False()
    {
        // Hợp đồng đã lập mà quá hạn giữ chỗ do ContractService hủy hợp đồng; yêu cầu giữ DaLapHopDong.
        var request = Approved();
        request.Status = RentalRequestStatus.DaLapHopDong;

        Assert.False(request.ShouldExpireHold(ApprovedAt.AddDays(10)));
    }

    [Fact]
    public void ExpireHold_QuaHan_HetHan()
    {
        var request = Approved();

        request.ExpireHold(ApprovedAt.AddHours(73));

        Assert.Equal(RentalRequestStatus.HetHan, request.Status);
        Assert.Equal(ApprovedAt, request.ProcessedAt);
    }

    [Fact]
    public void ExpireHold_ConHan_NemLoiVaGiuNguyen()
    {
        var request = Approved();

        Assert.Throws<InvalidOperationException>(() => request.ExpireHold(ApprovedAt.AddHours(72)));
        Assert.Equal(RentalRequestStatus.DaDuyet, request.Status);
    }

    [Fact]
    public void MarkContractCreated_DaDuyetConHan_DaLapHopDongGiuNguyenLucDuyet()
    {
        var request = Approved();

        request.MarkContractCreated(ApprovedAt.AddHours(20));

        Assert.Equal(RentalRequestStatus.DaLapHopDong, request.Status);
        // Hạn giữ chỗ của hợp đồng vẫn tính từ lúc duyệt.
        Assert.Equal(ApprovedAt.AddHours(72), request.HoldDeadline);
    }

    [Fact]
    public void MarkContractCreated_QuaHanGiuCho_NemLoiVaGiuNguyen()
    {
        var request = Approved();

        Assert.Throws<InvalidOperationException>(() => request.MarkContractCreated(ApprovedAt.AddHours(73)));
        Assert.Equal(RentalRequestStatus.DaDuyet, request.Status);
    }
}
