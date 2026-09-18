namespace SmartRent.Domain.Entities;

/// <summary>
/// Phí dịch vụ đã chốt trong hợp đồng. Đây là bản sao tại thời điểm lập hợp đồng
/// của phí dịch vụ ở mức phòng, không phải tham chiếu.
/// </summary>
public class ContractServiceFee
{
    public long Id { get; set; }

    public long ContractId { get; set; }

    public Contract Contract { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    public decimal Amount { get; set; }
}

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
