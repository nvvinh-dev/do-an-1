using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using SmartRent.Api.Contracts;

namespace SmartRent.Api.Services;

/// <summary>
/// Danh mục tỉnh/thành – phường/xã (FR-99), nạp một lần từ file tĩnh Data/locations.json.
/// Tên trong file đã chuẩn hóa Unicode NFC; nguồn và cách lấy ghi ở README mục 10.
/// </summary>
public class LocationCatalog
{
    /// <summary>
    /// Đọc chặt: thiếu khóa, sai tên khóa hay giá trị null đều là file hỏng và báo lỗi ngay,
    /// thay vì ra một danh mục thiếu rồi từ chối nhầm địa chỉ hợp lệ.
    /// </summary>
    private static readonly JsonSerializerOptions ReadOptions = new(JsonSerializerDefaults.Web)
    {
        RespectNullableAnnotations = true,
        RespectRequiredConstructorParameters = true,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow
    };

    private readonly Dictionary<string, HashSet<string>> _wardsByCity;

    public LocationCatalog()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Data", "locations.json");
        List<LocationResponse>? locations;

        try
        {
            using var stream = File.OpenRead(path);
            locations = JsonSerializer.Deserialize<List<LocationResponse>>(stream, ReadOptions);
        }
        catch (Exception ex) when (ex is JsonException or IOException)
        {
            throw new InvalidOperationException($"Khong doc duoc danh muc dia gioi {path}: {ex.Message}", ex);
        }

        if (locations is null || locations.Count == 0 || locations.Any(l => l.Wards.Count == 0))
        {
            throw new InvalidOperationException($"Danh muc dia gioi rong hoac co tinh/thanh khong co phuong/xa: {path}");
        }

        var duplicate = locations.GroupBy(l => l.City, StringComparer.Ordinal).FirstOrDefault(g => g.Count() > 1);

        if (duplicate is not null)
        {
            throw new InvalidOperationException($"Danh muc dia gioi trung tinh/thanh \"{duplicate.Key}\": {path}");
        }

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
