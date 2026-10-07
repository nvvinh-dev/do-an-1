using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Services;

/// <summary>Bộ lọc truy vấn phòng dùng chung, dịch được sang SQL.</summary>
public static class RoomQueryExtensions
{
    /// <summary>
    /// BR-05 (FR-23, FR-16) — chỉ giữ phòng đang xuất hiện trong tìm kiếm: phòng Trống, đang bật hiển thị,
    /// khu trọ đang khai thác và Chủ trọ không bị khóa. Dùng cho tìm kiếm, chi tiết phòng công khai và gửi yêu cầu thuê.
    /// Cùng bốn điều kiện với <see cref="Room.IsListed"/> (dùng khi trả isListed cho Chủ trọ) — đổi BR-05 thì sửa cả hai.
    /// </summary>
    /// <param name="users">Bảng người dùng của cùng DbContext, để kiểm tra Chủ trọ bị khóa trong cùng câu SQL.</param>
    public static IQueryable<Room> WhereListed(this IQueryable<Room> rooms, IQueryable<AppUser> users)
        => rooms.Where(r => r.OccupancyStatus == RoomOccupancyStatus.Trong
                            && r.VisibilityStatus == RoomVisibilityStatus.DangHienThi
                            && r.Property.Status == PropertyStatus.DangKhaiThac
                            && users.Any(u => u.Id == r.Property.LandlordUserId && !u.IsLocked));
}
