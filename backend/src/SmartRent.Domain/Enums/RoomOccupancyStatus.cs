namespace SmartRent.Domain.Enums;

/// <summary>
/// Trạng thái khai thác của phòng — phản ánh tình trạng thực tế.
/// Độc lập với <see cref="RoomVisibilityStatus"/>.
/// </summary>
public enum RoomOccupancyStatus
{
    Trong,
    DangGiuCho,
    DangThue,
    BaoTri,
    LuuTru
}
