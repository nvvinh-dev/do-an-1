namespace SmartRent.Domain.Enums;

/// <summary>
/// Loại hóa đơn. Không có loại hóa đơn điều chỉnh riêng: sai sót được sửa bằng dòng
/// DieuChinhKhac ở hóa đơn kế tiếp hoặc hóa đơn thanh lý (BR-16).
/// </summary>
public enum InvoiceType
{
    DinhKy,
    ThanhLy
}
