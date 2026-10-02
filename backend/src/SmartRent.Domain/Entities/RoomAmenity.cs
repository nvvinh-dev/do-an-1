namespace SmartRent.Domain.Entities;

/// <summary>Bảng nối giữa phòng và tiện ích.</summary>
public class RoomAmenity
{
    public long RoomId { get; set; }

    public Room Room { get; set; } = null!;

    public long AmenityId { get; set; }

    public Amenity Amenity { get; set; } = null!;
}
