using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;

namespace SmartRent.UnitTests;

public class RoomTests
{
    [Fact]
    public void IsListed_DuBonDieuKienBr05_True()
    {
        Assert.True(Room.IsListed(
            RoomOccupancyStatus.Trong,
            RoomVisibilityStatus.DangHienThi,
            PropertyStatus.DangKhaiThac,
            landlordLocked: false));
    }

    [Theory]
    [InlineData(RoomOccupancyStatus.DangGiuCho)]
    [InlineData(RoomOccupancyStatus.DangThue)]
    [InlineData(RoomOccupancyStatus.BaoTri)]
    [InlineData(RoomOccupancyStatus.LuuTru)]
    public void IsListed_PhongKhongTrong_False(RoomOccupancyStatus occupancy)
    {
        Assert.False(Room.IsListed(
            occupancy,
            RoomVisibilityStatus.DangHienThi,
            PropertyStatus.DangKhaiThac,
            landlordLocked: false));
    }

    [Theory]
    [InlineData(RoomVisibilityStatus.DaAnBoiChuTro)]
    [InlineData(RoomVisibilityStatus.DaAnBoiAdmin)]
    public void IsListed_PhongDaAn_False(RoomVisibilityStatus visibility)
    {
        Assert.False(Room.IsListed(
            RoomOccupancyStatus.Trong,
            visibility,
            PropertyStatus.DangKhaiThac,
            landlordLocked: false));
    }

    [Fact]
    public void IsListed_KhuTroDaLuuTru_False()
    {
        Assert.False(Room.IsListed(
            RoomOccupancyStatus.Trong,
            RoomVisibilityStatus.DangHienThi,
            PropertyStatus.LuuTru,
            landlordLocked: false));
    }

    [Fact]
    public void IsListed_ChuTroBiKhoa_False()
    {
        Assert.False(Room.IsListed(
            RoomOccupancyStatus.Trong,
            RoomVisibilityStatus.DangHienThi,
            PropertyStatus.DangKhaiThac,
            landlordLocked: true));
    }

    [Theory]
    [InlineData(RoomOccupancyStatus.LuuTru, true)]
    [InlineData(RoomOccupancyStatus.Trong, false)]
    [InlineData(RoomOccupancyStatus.DangThue, false)]
    public void IsArchived_ChiDungKhiLuuTru(RoomOccupancyStatus occupancy, bool expected)
    {
        var room = new Room { OccupancyStatus = occupancy };

        Assert.Equal(expected, room.IsArchived);
    }
}
