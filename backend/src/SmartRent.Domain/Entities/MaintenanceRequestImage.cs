namespace SmartRent.Domain.Entities;

/// <summary>Ảnh sự cố — đường dẫn file AnhSuCo trong bucket riêng tư.</summary>
public class MaintenanceRequestImage
{
    public long Id { get; set; }

    public long MaintenanceRequestId { get; set; }

    public MaintenanceRequest MaintenanceRequest { get; set; } = null!;

    public string Url { get; set; } = string.Empty;

    public int DisplayOrder { get; set; }
}
