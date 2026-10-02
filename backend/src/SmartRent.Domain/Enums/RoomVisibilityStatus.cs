namespace SmartRent.Domain.Enums;

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
