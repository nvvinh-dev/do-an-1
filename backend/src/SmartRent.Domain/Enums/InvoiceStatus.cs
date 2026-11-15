namespace SmartRent.Domain.Enums;

/// <summary>
/// Vòng đời hóa đơn. ChoNguoiThueXacNhan và ChoHoanCoc chỉ dùng cho hóa đơn thanh lý;
/// DaChuyenThanhLy là hóa đơn còn nợ đã kết chuyển vào hóa đơn thanh lý (FR-92).
/// </summary>
public enum InvoiceStatus
{
    Nhap,
    ChuaThanhToan,
    ChoXacNhan,
    ThanhToanMotPhan,
    QuaHan,
    DaThanhToan,
    DaHuy,
    DaChuyenThanhLy,
    ChoNguoiThueXacNhan,
    ChoHoanCoc
}
