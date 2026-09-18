using SmartRent.Domain.Enums;

namespace SmartRent.Domain.Entities;

/// <summary>Khu trọ. Một khu trọ thuộc về đúng một Chủ trọ.</summary>
public class Property
{
    public long Id { get; set; }

    public long LandlordUserId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public string? Ward { get; set; }

    public string? District { get; set; }

    public string City { get; set; } = string.Empty;

    public string? Description { get; set; }

    public PropertyStatus Status { get; set; }

    public ICollection<Room> Rooms { get; set; } = [];

    public ICollection<PropertyImage> Images { get; set; } = [];

    public ICollection<PropertyAmenity> Amenities { get; set; } = [];
}
