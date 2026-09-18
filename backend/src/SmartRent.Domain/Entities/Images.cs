namespace SmartRent.Domain.Entities;

/// <summary>Ảnh của khu trọ. Thuộc bucket công khai trên Supabase Storage.</summary>
public class PropertyImage
{
    public long Id { get; set; }

    public long PropertyId { get; set; }

    public Property Property { get; set; } = null!;

    public string Url { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }
}

/// <summary>Ảnh của phòng. Thuộc bucket công khai trên Supabase Storage.</summary>
public class RoomImage
{
    public long Id { get; set; }

    public long RoomId { get; set; }

    public Room Room { get; set; } = null!;

    public string Url { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }
}
