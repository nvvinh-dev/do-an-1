using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

public class RentalRequestTests
{
    private static readonly DateTimeOffset SubmittedAt = new(2026, 10, 1, 8, 0, 0, TimeSpan.Zero);

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
}
