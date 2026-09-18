using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using SmartRent.Domain.Enums;

namespace SmartRent.Infrastructure.Storage;

public class SupabaseStorageOptions
{
    public const string SectionName = "Supabase";

    /// <summary>Ví dụ: https://abcdefgh.supabase.co</summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>Khóa có toàn quyền trên Storage. Chỉ dùng ở backend, không bao giờ gửi ra client.</summary>
    public string ServiceRoleKey { get; set; } = string.Empty;

    public string PublicBucket { get; set; } = "public-media";

    public string PrivateBucket { get; set; } = "private-documents";
}

/// <summary>
/// Gọi thẳng REST API của Supabase Storage bằng HttpClient.
/// Hệ thống chỉ cần ba thao tác nên không dùng thư viện client ngoài.
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
        string fileName,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        var bucket = BucketOf(purpose);

        // Tên file do người dùng đặt không được dùng trực tiếp: tránh trùng tên,
        // tránh ký tự lạ và tránh lộ thông tin qua tên file.
        var extension = Path.GetExtension(fileName);
        var objectPath = $"{purpose}/{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid():N}{extension}";

        using var payload = new StreamContent(content);
        payload.Headers.ContentType = new MediaTypeHeaderValue(contentType);

        var response = await _http.PostAsync($"object/{bucket}/{objectPath}", payload, cancellationToken);
        await EnsureSuccessAsync(response, "tai file len", cancellationToken);

        var storedPath = $"{bucket}/{objectPath}";

        var url = IsPublic(purpose)
            ? $"{_options.Url.TrimEnd('/')}/storage/v1/object/public/{bucket}/{objectPath}"
            : await CreateSignedUrlAsync(storedPath, TimeSpan.FromHours(1), cancellationToken);

        return new StoredFile(storedPath, url);
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
