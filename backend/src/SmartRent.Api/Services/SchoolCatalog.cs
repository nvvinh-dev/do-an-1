using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using SmartRent.Api.Contracts;

namespace SmartRent.Api.Services;

/// <summary>
/// Danh mục trường đại học, học viện và cao đẳng cho hồ sơ ở ghép (FR-112), nạp một lần từ file tĩnh
/// Data/schools.json. Tên trong file đã chuẩn hóa Unicode NFC; nguồn và cách lấy ghi ở README mục 10.
/// </summary>
public partial class SchoolCatalog
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

        // Frontend dùng một giá trị có gạch dưới cho mục Trường khác, nên mã chỉ gồm chữ thường, số và gạch ngang.
        var badCode = schools.FirstOrDefault(s => !CodePattern().IsMatch(s.Code));

        if (badCode is not null)
        {
            throw new InvalidOperationException($"Danh muc truong co ma sai dinh dang \"{badCode.Code}\": {path}");
        }

        var badAlias = schools.FirstOrDefault(s => s.Aliases.Any(a => !a.Any(char.IsLetterOrDigit)));

        if (badAlias is not null)
        {
            throw new InvalidOperationException(
                $"Danh muc truong co ten viet tat khong co chu hoac so o truong \"{badAlias.Code}\": {path}");
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

    [GeneratedRegex("^[a-z0-9]+(-[a-z0-9]+)*$")]
    private static partial Regex CodePattern();

    /// <summary>Trường có mã <paramref name="code"/>, hoặc null nếu mã không có trong danh mục.</summary>
    public SchoolResponse? Find(string code) => _byCode.GetValueOrDefault(code);
}
