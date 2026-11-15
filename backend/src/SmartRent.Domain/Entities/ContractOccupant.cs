namespace SmartRent.Domain.Entities;

/// <summary>
/// Người ở cùng trong phòng nhưng không đứng tên hợp đồng.
/// Chỉ ghi nhận thông tin, không có tài khoản và không có nghĩa vụ tài chính.
/// </summary>
public class ContractOccupant
{
    public long Id { get; set; }

    public long ContractId { get; set; }

    public Contract Contract { get; set; } = null!;

    public string FullName { get; set; } = string.Empty;

    public string? PhoneNumber { get; set; }
}
