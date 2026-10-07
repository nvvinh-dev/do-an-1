using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using SmartRent.Domain.Enums;

namespace SmartRent.Infrastructure.Storage;

/// <summary>
/// Gọi thẳng REST API của Supabase Storage bằng HttpClient.
/// Hệ thống chỉ cần vài thao tác nên không dùng thư viện client ngoài.
/// </summary>
public class SupabaseStorageClient : IFileStorage
{
    private readonly HttpClient _http;
    private readonly SupabaseStorageOptions _options;

    public SupabaseStorageClient(HttpClient http, IOptions<SupabaseStorageOptions> options)
    {
        _options = options.Value;

        if (string.IsNullOrWhiteSpace(_options.Url) || string.IsNullOrWhiteSpace(_options.ServiceRoleKey))
        {
            throw new InvalidOperationException(
                "Thieu Supabase:Url hoac Supabase:ServiceRoleKey. " +
                "Dat bang: dotnet user-secrets set \"Supabase:Url\" \"...\"");
        }

        _http = http;
        _http.BaseAddress = new Uri($"{_options.Url.TrimEnd('/')}/storage/v1/");
        _http.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _options.ServiceRoleKey);
        _http.DefaultRequestHeaders.Add("apikey", _options.ServiceRoleKey);
    }

    /// <summary>Ảnh khu trọ và ảnh phòng là công khai; bốn loại còn lại là riêng tư.</summary>
    private bool IsPublic(FilePurpose purpose)
        => purpose is FilePurpose.AnhKhuTro or FilePurpose.AnhPhong;

    private string BucketOf(FilePurpose purpose)
        => IsPublic(purpose) ? _options.PublicBucket : _options.PrivateBucket;

    public async Task<StoredFile> UploadAsync(
        FilePurpose purpose,
        long ownerUserId,
        string extension,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        var bucket = BucketOf(purpose);

        // Tên file do người dùng đặt không được dùng: tránh trùng tên,
        // tránh ký tự lạ và tránh lộ thông tin qua tên file.
        // Thư mục theo purpose và id người tải để kiểm tra lại được ở request nghiệp vụ.
        var objectPath = $"{purpose}/{ownerUserId}/{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid():N}{extension}";

        using var payload = new StreamContent(content);
        payload.Headers.ContentType = new MediaTypeHeaderValue(contentType);

        var response = await _http.PostAsync($"object/{bucket}/{objectPath}", payload, cancellationToken);
        await EnsureSuccessAsync(response, "tai file len", cancellationToken);

        var storedPath = $"{bucket}/{objectPath}";

        var url = IsPublic(purpose)
            ? GetPublicUrl(storedPath)
            : await CreateSignedUrlAsync(storedPath, TimeSpan.FromHours(1), cancellationToken);

        return new StoredFile(storedPath, url);
    }

    public string GetPublicUrl(string path)
        => $"{_options.Url.TrimEnd('/')}/storage/v1/object/public/{path}";

    public async Task<bool> IsOwnedByAsync(
        string path,
        FilePurpose purpose,
        long ownerUserId,
        CancellationToken cancellationToken = default)
    {
        // Khớp đúng định dạng UploadAsync sinh ra:
        // <bucket>/<purpose>/<userId>/<yyyy>/<MM>/<32 ký tự hex>.<phần mở rộng>.
        // Không nhận ký tự nào ngoài định dạng này, nên "..", "%2e%2e" hay đường dẫn tự chế đều bị loại.
        // Kết thúc bằng \z chứ không phải $: trong .NET, $ vẫn khớp khi chuỗi có "\n" ở cuối.
        var extensions = IsPublic(purpose) ? "jpg|png|webp" : "jpg|png|webp|pdf";
        var pattern = $@"^{Regex.Escape(BucketOf(purpose))}/{purpose}/{ownerUserId}/[0-9]{{4}}/[0-9]{{2}}/[0-9a-f]{{32}}\.({extensions})\z";

        if (!Regex.IsMatch(path, pattern, RegexOptions.CultureInvariant))
        {
            return false;
        }

        // Đúng định dạng nhưng có thể là đường dẫn chưa từng được tải lên.
        var (bucket, objectPath) = SplitPath(path);
        using var request = new HttpRequestMessage(HttpMethod.Head, $"object/{bucket}/{objectPath}");
        using var response = await _http.SendAsync(request, cancellationToken);

        if (response.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.BadRequest)
        {
            return false;
        }

        await EnsureSuccessAsync(response, "kiem tra file ton tai", cancellationToken);
        return true;
    }

    public async Task<string> CreateSignedUrlAsync(
        string path,
        TimeSpan lifetime,
        CancellationToken cancellationToken = default)
    {
        var (bucket, objectPath) = SplitPath(path);

        var response = await _http.PostAsJsonAsync(
            $"object/sign/{bucket}/{objectPath}",
            new { expiresIn = (int)lifetime.TotalSeconds },
            cancellationToken);

        await EnsureSuccessAsync(response, "tao url co chu ky", cancellationToken);

        var body = await response.Content.ReadFromJsonAsync<SignedUrlResponse>(cancellationToken);

        if (body is null || string.IsNullOrWhiteSpace(body.SignedUrl))
        {
            throw new InvalidOperationException("Supabase Storage khong tra ve url co chu ky.");
        }

        return $"{_options.Url.TrimEnd('/')}/storage/v1{body.SignedUrl}";
    }

    public async Task DeleteAsync(string path, CancellationToken cancellationToken = default)
    {
        var (bucket, objectPath) = SplitPath(path);

        var response = await _http.DeleteAsync($"object/{bucket}/{objectPath}", cancellationToken);
        await EnsureSuccessAsync(response, "xoa file", cancellationToken);
    }

    private static (string Bucket, string ObjectPath) SplitPath(string path)
    {
        var separator = path.IndexOf('/');

        if (separator <= 0 || separator == path.Length - 1)
        {
            throw new ArgumentException($"Duong dan file khong hop le: {path}", nameof(path));
        }

        return (path[..separator], path[(separator + 1)..]);
    }

    private static async Task EnsureSuccessAsync(
        HttpResponseMessage response,
        string action,
        CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        var detail = await response.Content.ReadAsStringAsync(cancellationToken);

        throw new InvalidOperationException(
            $"Supabase Storage loi khi {action}: {(int)response.StatusCode} {detail}");
    }

    private sealed record SignedUrlResponse([property: JsonPropertyName("signedURL")] string SignedUrl);
}
