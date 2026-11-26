using System.Text;

namespace SmartRent.Domain;

/// <summary>
/// Bộ lọc AI đọc ra từ câu tìm phòng tự nhiên, chưa kiểm tra (BP-04 A1). Tên trường trùng tham số của
/// <c>GET /rooms/search</c>, riêng tiện ích là tên — server mới đổi sang id theo danh mục.
/// </summary>
public sealed record AiRoomSearchFilters(
    decimal? MinPrice,
    decimal? MaxPrice,
    decimal? MinArea,
    decimal? MaxArea,
    string? City,
    string? Ward,
    IReadOnlyList<string>? Amenities,
    int? MinOccupants,
    string? SortBy,
    string? SortDirection,
    IReadOnlyList<string>? Unsupported);

/// <summary>Một tỉnh/thành và các phường/xã của nó, tên đã chuẩn hóa NFC như danh mục <c>GET /locations</c>.</summary>
public sealed record NaturalRoomSearchLocation(string City, IReadOnlyList<string> Wards);

/// <summary>Một tiện ích trong danh mục <c>GET /amenities</c>.</summary>
public sealed record NaturalRoomSearchAmenity(long Id, string Name);

/// <summary>Danh mục để đối chiếu bộ lọc AI. Danh sách tiện ích theo thứ tự danh mục.</summary>
public sealed record NaturalRoomSearchCatalog(
    IReadOnlyList<NaturalRoomSearchLocation> Locations,
    IReadOnlyList<NaturalRoomSearchAmenity> Amenities);

/// <summary>
/// Bộ lọc đã qua kiểm tra, dùng thẳng làm tham số của <c>GET /rooms/search</c> mà không bị <c>400</c>.
/// Trường <c>null</c> (và <see cref="AmenityIds"/> rỗng) là câu hỏi không nhắc tới.
/// </summary>
public sealed record NaturalRoomSearchFilters(
    decimal? MinPrice,
    decimal? MaxPrice,
    decimal? MinArea,
    decimal? MaxArea,
    string? City,
    string? Ward,
    IReadOnlyList<long> AmenityIds,
    int? MinOccupants,
    string? SortBy,
    string? SortDirection)
{
    /// <summary>Không rút ra được bộ lọc nào — endpoint trả <c>422</c> (FR-125).</summary>
    public bool IsEmpty =>
        MinPrice is null && MaxPrice is null && MinArea is null && MaxArea is null
        && City is null && Ward is null && AmenityIds.Count == 0 && MinOccupants is null && SortBy is null;
}

/// <summary>Kết quả kiểm tra: bộ lọc dùng được và các ý chưa lọc được để giao diện hiện "Chưa lọc được theo: …".</summary>
public sealed record NaturalRoomSearchResult(NaturalRoomSearchFilters Filters, IReadOnlyList<string> Unsupported);

/// <summary>
/// Kiểm tra bộ lọc AI trả về như tham số người dùng gửi cho <c>GET /rooms/search</c> (FR-124, BR-18): tỉnh/thành,
/// phường/xã, tiện ích chỉ nhận tên có trong danh mục; giá trị vi phạm điều kiện <c>400</c> của tìm kiếm thường bị bỏ.
/// Mọi giá trị bị bỏ được ghi thêm vào <c>unsupported</c> sau các ý AI tự báo (FR-125). Ngược lại, ý AI tự báo mà
/// trùng tên tiện ích hoặc tỉnh/thành trong danh mục thì vẫn được lọc.
/// </summary>
/// <remarks>
/// Phường/xã không kèm tỉnh/thành hợp lệ thì tìm trong cả danh mục: tên chỉ có ở đúng một tỉnh/thành thì điền luôn
/// tỉnh/thành đó, trùng ở nhiều nơi thì bỏ. So khớp sau khi bỏ khoảng trắng thừa, chuẩn hóa NFC, không phân biệt hoa
/// thường; tên đầy đủ ("Phường Linh Xuân") khớp trước, không có thì so tên bỏ tiền tố ("Linh Xuân").
/// </remarks>
public static class NaturalRoomSearch
{
    /// <summary>Số ý AI tự báo tối đa được giữ trong <c>unsupported</c>.</summary>
    public const int MaxUnsupportedItems = 10;

    /// <summary>Độ dài tối đa của một ý AI tự báo; dài hơn thì cắt.</summary>
    public const int MaxUnsupportedLength = 200;

    private static readonly string[] SortFields = ["price", "area"];

    private static readonly string[] SortDirections = ["asc", "desc"];

    private static readonly string[] CityPrefixes = ["Thành phố ", "Tỉnh ", "TP. ", "TP."];

    private static readonly string[] WardPrefixes = ["Phường ", "Xã ", "Đặc khu "];

    private static readonly string[] AmenityVerbPrefixes = ["có "];

    public static NaturalRoomSearchResult Sanitize(AiRoomSearchFilters raw, NaturalRoomSearchCatalog catalog)
    {
        var unsupported = new List<string>();

        var (rawCity, amenityNames, aiUnsupported) = RecoverFromUnsupported(raw, catalog);

        var (city, ward) = ResolveLocation(rawCity, raw.Ward, catalog.Locations, unsupported);
        var amenityIds = ResolveAmenities(amenityNames, catalog.Amenities, unsupported);

        var (minPrice, maxPrice) = CheckRange(raw.MinPrice, raw.MaxPrice, "Khoảng giá", unsupported);
        var (minArea, maxArea) = CheckRange(raw.MinArea, raw.MaxArea, "Khoảng diện tích", unsupported);

        var minOccupants = raw.MinOccupants;

        if (minOccupants is < 1)
        {
            minOccupants = null;
            unsupported.Add("Số người");
        }

        var (sortBy, sortDirection) = CheckSort(raw.SortBy, raw.SortDirection, unsupported);

        var filters = new NaturalRoomSearchFilters(
            minPrice, maxPrice, minArea, maxArea, city, ward, amenityIds, minOccupants, sortBy, sortDirection);

        return new NaturalRoomSearchResult(filters, MergeUnsupported(aiUnsupported, unsupported));
    }

    /// <summary>
    /// Ý AI báo chưa lọc được mà thực ra trùng tên trong danh mục thì vẫn lọc: trùng tên tiện ích (bỏ chữ "có" đầu câu)
    /// thì thêm vào tiện ích; trùng tên tỉnh/thành khi AI chưa điền tỉnh/thành thì lấy làm tỉnh/thành.
    /// </summary>
    private static (string? City, List<string> Amenities, List<string> Unsupported) RecoverFromUnsupported(
        AiRoomSearchFilters raw, NaturalRoomSearchCatalog catalog)
    {
        var city = Clean(raw.City);
        var amenities = (raw.Amenities ?? []).ToList();
        var rest = new List<string>();

        foreach (var item in raw.Unsupported ?? [])
        {
            if (Clean(item) is not { } cleaned)
            {
                continue;
            }

            var withoutVerb = StripPrefix(cleaned, AmenityVerbPrefixes);

            if (catalog.Amenities.Any(a => Key(a.Name) == Key(withoutVerb)))
            {
                amenities.Add(withoutVerb);
            }
            else if (city is null && FindUnique(catalog.Locations, l => l.City, cleaned, CityPrefixes) is not null)
            {
                city = cleaned;
            }
            else
            {
                rest.Add(cleaned);
            }
        }

        return (city, amenities, rest);
    }

    private static (string? City, string? Ward) ResolveLocation(
        string? rawCity,
        string? rawWard,
        IReadOnlyList<NaturalRoomSearchLocation> locations,
        List<string> unsupported)
    {
        NaturalRoomSearchLocation? city = null;

        if (Clean(rawCity) is { } cityName)
        {
            city = FindUnique(locations, l => l.City, cityName, CityPrefixes);

            if (city is null)
            {
                unsupported.Add($"Tỉnh/thành \"{cityName}\"");
            }
        }

        if (Clean(rawWard) is not { } wardName)
        {
            return (city?.City, null);
        }

        // Tỉnh/thành đã rõ thì chỉ tìm trong tỉnh/thành đó, kể cả khi phường/xã cùng tên có ở nơi khác.
        IReadOnlyList<NaturalRoomSearchLocation> scope = city is null ? locations : [city];
        var candidates = scope
            .SelectMany(l => l.Wards.Select(w => (l.City, Ward: w)))
            .ToList();

        var match = FindUnique(candidates, c => c.Ward, wardName, WardPrefixes);

        if (match == default)
        {
            unsupported.Add($"Phường/xã \"{wardName}\"");
            return (city?.City, null);
        }

        return (match.City, match.Ward);
    }

    private static IReadOnlyList<long> ResolveAmenities(
        IReadOnlyList<string>? rawNames,
        IReadOnlyList<NaturalRoomSearchAmenity> amenities,
        List<string> unsupported)
    {
        var ids = new HashSet<long>();

        foreach (var raw in rawNames ?? [])
        {
            if (Clean(raw) is not { } name)
            {
                continue;
            }

            var amenity = amenities.FirstOrDefault(a => Key(a.Name) == Key(name));

            if (amenity is null)
            {
                AddOnce(unsupported, $"Tiện ích \"{name}\"");
            }
            else
            {
                ids.Add(amenity.Id);
            }
        }

        // Theo thứ tự danh mục, như các danh sách tiện ích khác.
        return amenities.Where(a => ids.Contains(a.Id)).Select(a => a.Id).ToList();
    }

    /// <summary>Giá trị âm bị bỏ riêng; hai đầu ngược nhau thì bỏ cả hai, vì không biết đầu nào AI đọc sai.</summary>
    private static (decimal? Min, decimal? Max) CheckRange(
        decimal? min, decimal? max, string label, List<string> unsupported)
    {
        var dropped = false;

        if (min is < 0)
        {
            min = null;
            dropped = true;
        }

        if (max is < 0)
        {
            max = null;
            dropped = true;
        }

        if (min is not null && max is not null && min > max)
        {
            min = null;
            max = null;
            dropped = true;
        }

        if (dropped)
        {
            unsupported.Add(label);
        }

        return (min, max);
    }

    private static (string? SortBy, string? SortDirection) CheckSort(
        string? rawSortBy, string? rawSortDirection, List<string> unsupported)
    {
        var sortBy = Clean(rawSortBy)?.ToLowerInvariant();
        var sortDirection = Clean(rawSortDirection)?.ToLowerInvariant();

        // Tìm kiếm thường bỏ qua chiều sắp xếp khi không có trường sắp xếp, nên không cần báo.
        if (sortBy is null)
        {
            return (null, null);
        }

        if (!SortFields.Contains(sortBy) || (sortDirection is not null && !SortDirections.Contains(sortDirection)))
        {
            unsupported.Add("Sắp xếp");
            return (null, null);
        }

        return (sortBy, sortDirection);
    }

    private static List<string> MergeUnsupported(IReadOnlyList<string>? fromAi, List<string> fromServer)
    {
        var merged = new List<string>();

        foreach (var raw in fromAi ?? [])
        {
            if (merged.Count == MaxUnsupportedItems)
            {
                break;
            }

            if (Clean(raw) is { } item)
            {
                AddOnce(merged, item.Length > MaxUnsupportedLength ? item[..MaxUnsupportedLength] : item);
            }
        }

        foreach (var item in fromServer)
        {
            AddOnce(merged, item);
        }

        return merged;
    }

    /// <summary>
    /// Phần tử duy nhất khớp tên đầy đủ; không có thì phần tử duy nhất khớp tên đã bỏ tiền tố.
    /// Không khớp hoặc khớp nhiều phần tử thì trả <c>default</c>.
    /// </summary>
    private static T? FindUnique<T>(IReadOnlyList<T> items, Func<T, string> name, string wanted, string[] prefixes)
    {
        var wantedKey = Key(wanted);
        var exact = items.Where(i => Key(name(i)) == wantedKey).Take(2).ToList();

        if (exact.Count > 0)
        {
            return exact.Count == 1 ? exact[0] : default;
        }

        var wantedCore = Key(StripPrefix(wanted, prefixes));
        var core = items.Where(i => Key(StripPrefix(name(i), prefixes)) == wantedCore).Take(2).ToList();

        return core.Count == 1 ? core[0] : default;
    }

    private static string StripPrefix(string name, string[] prefixes)
    {
        foreach (var prefix in prefixes)
        {
            if (name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) && name.Length > prefix.Length)
            {
                return name[prefix.Length..].Trim();
            }
        }

        return name;
    }

    private static void AddOnce(List<string> items, string item)
    {
        if (!items.Contains(item, StringComparer.OrdinalIgnoreCase))
        {
            items.Add(item);
        }
    }

    /// <summary>Bỏ khoảng trắng hai đầu, gộp khoảng trắng giữa các chữ, chuẩn hóa NFC; rỗng thì <c>null</c>.</summary>
    private static string? Clean(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var words = value.Normalize(NormalizationForm.FormC)
            .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);

        return string.Join(' ', words);
    }

    /// <summary>Khóa so khớp: đã làm sạch và không phân biệt hoa thường.</summary>
    private static string Key(string value) => (Clean(value) ?? string.Empty).ToUpperInvariant();
}
