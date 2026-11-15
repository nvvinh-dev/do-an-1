namespace SmartRent.Domain.Entities;

/// <summary>Khoản phí dịch vụ cố định của phòng: rác, internet, giữ xe, phí quản lý.</summary>
public class RoomServiceFee
{
    public long Id { get; set; }

    public long RoomId { get; set; }

    public Room Room { get; set; } = null!;

    public string Name { get; set; } = string.Empty;

    public decimal Amount { get; set; }
}
