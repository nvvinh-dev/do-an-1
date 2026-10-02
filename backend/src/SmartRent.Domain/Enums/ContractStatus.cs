namespace SmartRent.Domain.Enums;

/// <summary>
/// Vòng đời hợp đồng trong Phase 1.
/// Trạng thái kết thúc do gia hạn thuộc BP-09 (Phase 3), chưa có ở đây.
/// </summary>
public enum ContractStatus
{
    Nhap,
    ChoNguoiThueXacNhan,
    ChoNhanCoc,
    DangHieuLuc,
    SapHetHan,
    DangThanhLy,
    DaThanhLy,
    DaHuy
}
