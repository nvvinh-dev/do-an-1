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

    /// <summary>
    /// FR-89: Chủ trọ chỉ tự chuyển giữa Trống và Bảo trì; giữ nguyên trạng thái cũng không phải chuyển tiếp hợp lệ.
    /// </summary>
    [Theory]
    [InlineData(RoomOccupancyStatus.Trong, RoomOccupancyStatus.BaoTri, true)]
    [InlineData(RoomOccupancyStatus.BaoTri, RoomOccupancyStatus.Trong, true)]
    [InlineData(RoomOccupancyStatus.Trong, RoomOccupancyStatus.Trong, false)]
    [InlineData(RoomOccupancyStatus.BaoTri, RoomOccupancyStatus.BaoTri, false)]
    [InlineData(RoomOccupancyStatus.Trong, RoomOccupancyStatus.DangThue, false)]
    [InlineData(RoomOccupancyStatus.Trong, RoomOccupancyStatus.LuuTru, false)]
    [InlineData(RoomOccupancyStatus.DangThue, RoomOccupancyStatus.BaoTri, false)]
    [InlineData(RoomOccupancyStatus.DangGiuCho, RoomOccupancyStatus.Trong, false)]
    [InlineData(RoomOccupancyStatus.LuuTru, RoomOccupancyStatus.Trong, false)]
    public void CanChangeOccupancyTo_ChiTrongVaBaoTri(
        RoomOccupancyStatus current,
        RoomOccupancyStatus target,
        bool expected)
    {
        var room = new Room { OccupancyStatus = current };

        Assert.Equal(expected, room.CanChangeOccupancyTo(target, hasOpenContract: false));
    }

    /// <summary>BR-08, FR-18: về Trống khi hợp đồng hiện tại chưa ở Đã thanh lý hoặc Đã hủy thì bị từ chối.</summary>
    [Fact]
    public void CanChangeOccupancyTo_VeTrongKhiConHopDongChuaKetThuc_False()
    {
        var room = new Room { OccupancyStatus = RoomOccupancyStatus.BaoTri };

        Assert.False(room.CanChangeOccupancyTo(RoomOccupancyStatus.Trong, hasOpenContract: true));
    }

    /// <summary>BR-08 chỉ chặn chiều về Trống; chuyển sang Bảo trì không xét hợp đồng.</summary>
    [Fact]
    public void CanChangeOccupancyTo_SangBaoTri_KhongXetHopDong()
    {
        var room = new Room { OccupancyStatus = RoomOccupancyStatus.Trong };

        Assert.True(room.CanChangeOccupancyTo(RoomOccupancyStatus.BaoTri, hasOpenContract: true));
    }

    /// <summary>
    /// FR-15, api-design mục 5.2: Chủ trọ không tự bật lại tin bị Admin ẩn, và phòng đã lưu trữ không đổi hiển thị được.
    /// </summary>
    [Theory]
    [InlineData(RoomOccupancyStatus.Trong, RoomVisibilityStatus.DaAnBoiChuTro, true)]
    [InlineData(RoomOccupancyStatus.DangThue, RoomVisibilityStatus.DangHienThi, true)]
    [InlineData(RoomOccupancyStatus.BaoTri, RoomVisibilityStatus.DaAnBoiChuTro, true)]
    [InlineData(RoomOccupancyStatus.Trong, RoomVisibilityStatus.DaAnBoiAdmin, false)]
    [InlineData(RoomOccupancyStatus.LuuTru, RoomVisibilityStatus.DaAnBoiChuTro, false)]
    public void CanChangeVisibility(RoomOccupancyStatus occupancy, RoomVisibilityStatus visibility, bool expected)
    {
        var room = new Room { OccupancyStatus = occupancy, VisibilityStatus = visibility };

        Assert.Equal(expected, room.CanChangeVisibility);
    }

    /// <summary>FR-20: phòng chỉ lưu trữ được khi đang Trống hoặc Bảo trì.</summary>
    [Theory]
    [InlineData(RoomOccupancyStatus.Trong, true)]
    [InlineData(RoomOccupancyStatus.BaoTri, true)]
    [InlineData(RoomOccupancyStatus.DangGiuCho, false)]
    [InlineData(RoomOccupancyStatus.DangThue, false)]
    [InlineData(RoomOccupancyStatus.LuuTru, false)]
    public void CanBeArchived_ChiKhiTrongHoacBaoTri(RoomOccupancyStatus occupancy, bool expected)
    {
        var room = new Room { OccupancyStatus = occupancy };

        Assert.Equal(expected, room.CanBeArchived);
    }

    /// <summary>BR-10, FR-20: còn phòng Đang giữ chỗ hoặc Đang thuê thì không lưu trữ được khu trọ.</summary>
    [Theory]
    [InlineData(RoomOccupancyStatus.DangGiuCho, true)]
    [InlineData(RoomOccupancyStatus.DangThue, true)]
    [InlineData(RoomOccupancyStatus.Trong, false)]
    [InlineData(RoomOccupancyStatus.BaoTri, false)]
    [InlineData(RoomOccupancyStatus.LuuTru, false)]
    public void BlocksPropertyArchive_KhiDangGiuChoHoacDangThue(RoomOccupancyStatus occupancy, bool expected)
    {
        var room = new Room { OccupancyStatus = occupancy };

        Assert.Equal(expected, room.BlocksPropertyArchive);
    }
}
