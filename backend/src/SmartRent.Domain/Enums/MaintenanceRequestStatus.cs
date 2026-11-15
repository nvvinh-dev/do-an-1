namespace SmartRent.Domain.Enums;

/// <summary>
/// Vòng đời sự cố (BP-08, tài liệu phân tích mục 8.6). DaDong, TuChoi, DaHuy là trạng thái kết thúc.
/// </summary>
public enum MaintenanceRequestStatus
{
    Moi,
    DangXuLy,
    ChoNguoiThueXacNhan,
    DaDong,
    TuChoi,
    DaHuy
}
