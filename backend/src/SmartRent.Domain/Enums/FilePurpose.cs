namespace SmartRent.Domain.Enums;

/// <summary>
/// Mục đích của file được tải lên. Quyết định bucket lưu trữ và quyền truy cập:
/// hai giá trị đầu vào bucket công khai, các giá trị còn lại vào bucket riêng tư.
/// </summary>
public enum FilePurpose
{
    AnhKhuTro,
    AnhPhong,
    GiayToNhanThan,
    AnhDongHo,
    MinhChungThanhToan,
    AnhHuHong
}
