using SmartRent.Domain.Enums;

namespace SmartRent.Domain.Entities;

/// <summary>
/// Danh mục tiện ích. Được chuẩn hóa thành bảng riêng vì bộ lọc tìm kiếm
/// cho phép lọc theo tiện ích.
/// </summary>
public class Amenity
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public AmenityScope Scope { get; set; }
}

/// <summary>Bảng nối giữa khu trọ và tiện ích.</summary>
public class PropertyAmenity
{
    public long PropertyId { get; set; }

    public Property Property { get; set; } = null!;

    public long AmenityId { get; set; }

    public Amenity Amenity { get; set; } = null!;
}

/// <summary>Bảng nối giữa phòng và tiện ích.</summary>
public class RoomAmenity
{
    public long RoomId { get; set; }

    public Room Room { get; set; } = null!;

    public long AmenityId { get; set; }

    public Amenity Amenity { get; set; } = null!;
}
