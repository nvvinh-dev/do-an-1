using System.Text;
using System.Text.Json;
using SmartRent.Api.Contracts;

namespace SmartRent.Api.Services;

/// <summary>
/// Danh mục tỉnh/thành – phường/xã (FR-99), nạp một lần từ file tĩnh Data/locations.json.
/// Tên trong file đã chuẩn hóa Unicode NFC; nguồn và cách lấy ghi ở README mục 10.
/// </summary>
public class LocationCatalog
{
    private readonly Dictionary<string, HashSet<string>> _wardsByCity;

    public LocationCatalog()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Data", "locations.json");

        using var stream = File.OpenRead(path);
        var locations = JsonSerializer.Deserialize<List<LocationResponse>>(stream, JsonSerializerOptions.Web)
                        ?? throw new InvalidOperationException($"Khong doc duoc danh muc dia gioi: {path}");

        All = locations;
        _wardsByCity = locations.ToDictionary(
            l => l.City,
            l => l.Wards.ToHashSet(StringComparer.Ordinal),
            StringComparer.Ordinal);
    }

    public IReadOnlyList<LocationResponse> All { get; }

    /// <summary>Cặp tỉnh/thành – phường/xã có trong danh mục. So khớp chính xác, cả hai đã chuẩn hóa NFC.</summary>
    public bool Contains(string city, string ward)
        => _wardsByCity.TryGetValue(city, out var wards) && wards.Contains(ward);

    /// <summary>
    /// Đưa tên về cùng dạng với danh mục: bỏ khoảng trắng hai đầu và chuẩn hóa NFC,
    /// vì cùng một chữ có dấu có thể được gõ ở dạng tổ hợp (NFD).
    /// </summary>
    public static string Normalize(string name) => name.Trim().Normalize(NormalizationForm.FormC);
}
