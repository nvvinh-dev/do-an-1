namespace SmartRent.Domain.Entities;

/// <summary>Bảng nối giữa khu trọ và tiện ích.</summary>
public class PropertyAmenity
{
    public long PropertyId { get; set; }

    public Property Property { get; set; } = null!;

    public long AmenityId { get; set; }

    public Amenity Amenity { get; set; } = null!;
}
