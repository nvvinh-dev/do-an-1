namespace SmartRent.Domain.Enums;

/// <summary>Trạng thái khai thác của khu trọ.</summary>
public enum PropertyStatus
{
    DangKhaiThac,
    LuuTru
}

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

/// <summary>
/// Trạng thái hiển thị của phòng — phản ánh việc phòng có được quảng bá hay không.
/// Phòng ở <see cref="DaAnBoiAdmin"/> thì Chủ trọ không tự bật lại được.
/// </summary>
public enum RoomVisibilityStatus
{
    DangHienThi,
    DaAnBoiChuTro,
    DaAnBoiAdmin
}

/// <summary>Tiện ích thuộc về khu trọ hay thuộc về phòng.</summary>
public enum AmenityScope
{
    KhuTro,
    Phong
}
