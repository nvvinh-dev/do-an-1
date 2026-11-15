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
