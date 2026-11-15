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
