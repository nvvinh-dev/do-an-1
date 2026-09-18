using SmartRent.Domain.Enums;

namespace SmartRent.Domain.Entities;

/// <summary>
/// Phòng trọ. Ba cột giá ở đây là giá hiện hành, dùng khi lập hợp đồng mới.
/// Sửa giá không ảnh hưởng hợp đồng đang hiệu lực và hóa đơn đã phát hành.
/// </summary>
public class Room
{
    public long Id { get; set; }

    public long PropertyId { get; set; }

    public Property Property { get; set; } = null!;

    /// <summary>Mã hoặc tên phòng, duy nhất trong một khu trọ.</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Diện tích, đơn vị mét vuông.</summary>
    public decimal Area { get; set; }

    public int MaxOccupants { get; set; }

    public decimal RentPrice { get; set; }

    public decimal ElectricityUnitPrice { get; set; }

    public decimal WaterUnitPrice { get; set; }

    public string? Description { get; set; }

    public RoomOccupancyStatus OccupancyStatus { get; set; }

    public RoomVisibilityStatus VisibilityStatus { get; set; }

    public ICollection<RoomServiceFee> ServiceFees { get; set; } = [];

    public ICollection<RoomImage> Images { get; set; } = [];

    public ICollection<RoomAmenity> Amenities { get; set; } = [];
}
