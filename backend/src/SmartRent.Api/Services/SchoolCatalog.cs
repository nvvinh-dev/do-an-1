using System.Text.Json;
using System.Text.Json.Serialization;
using SmartRent.Api.Contracts;

namespace SmartRent.Api.Services;

/// <summary>
/// Danh mục trường đại học, học viện và cao đẳng cho hồ sơ ở ghép (FR-112), nạp một lần từ file tĩnh
/// Data/schools.json. Tên trong file đã chuẩn hóa Unicode NFC; nguồn và cách lấy ghi ở README mục 10.
/// </summary>
public class SchoolCatalog
{
    /// <summary>Đọc chặt như <see cref="LocationCatalog"/>: file thiếu khóa hay sai giá trị là file hỏng.</summary>
    private static readonly JsonSerializerOptions ReadOptions = new(JsonSerializerDefaults.Web)
    {
        RespectNullableAnnotations = true,
        RespectRequiredConstructorParameters = true,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow
    };

    private readonly Dictionary<string, SchoolResponse> _byCode;

    public SchoolCatalog()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Data", "schools.json");
        List<SchoolResponse>? schools;

        try
        {
            using var stream = File.OpenRead(path);
            schools = JsonSerializer.Deserialize<List<SchoolResponse>>(stream, ReadOptions);
        }
        catch (Exception ex) when (ex is JsonException or IOException)
        {
            throw new InvalidOperationException($"Khong doc duoc danh muc truong {path}: {ex.Message}", ex);
        }

        if (schools is null || schools.Count == 0
            || schools.Any(s => string.IsNullOrWhiteSpace(s.Code) || string.IsNullOrWhiteSpace(s.Name)))
        {
            throw new InvalidOperationException($"Danh muc truong rong hoac co truong thieu ma, ten: {path}");
        }

        var duplicate = schools.GroupBy(s => s.Code, StringComparer.Ordinal).FirstOrDefault(g => g.Count() > 1);

        if (duplicate is not null)
        {
            throw new InvalidOperationException($"Danh muc truong trung ma \"{duplicate.Key}\": {path}");
        }

        All = schools;
        _byCode = schools.ToDictionary(s => s.Code, StringComparer.Ordinal);
    }

    public IReadOnlyList<SchoolResponse> All { get; }

    /// <summary>Trường có mã <paramref name="code"/>, hoặc null nếu mã không có trong danh mục.</summary>
    public SchoolResponse? Find(string code) => _byCode.GetValueOrDefault(code);
}
