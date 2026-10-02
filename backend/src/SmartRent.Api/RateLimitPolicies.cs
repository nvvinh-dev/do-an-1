namespace SmartRent.Api;

/// <summary>
/// Tên các policy rate limiting. Ngưỡng cụ thể xem docs/security-design.md mục 6.
/// Gắn vào endpoint bằng thuộc tính [EnableRateLimiting(RateLimitPolicies.X)].
/// Nhóm đăng nhập không nằm ở đây vì chỉ đếm lần SAI — xem LoginAttemptLimiter.
/// </summary>
public static class RateLimitPolicies
{
    /// <summary>
    /// Đăng ký, quên mật khẩu, đặt lại mật khẩu — mỗi endpoint 3 lần mỗi giờ theo IP;
    /// ngưỡng đặt ở cấu hình RateLimiting:AuthAccountPerHour.
    /// </summary>
    public const string AuthAccount = "auth-account";

    /// <summary>Gửi yêu cầu thuê, báo đã thanh toán, nộp hồ sơ Chủ trọ — 10 lần mỗi giờ.</summary>
    public const string BusinessWrite = "business-write";

    /// <summary>Tải file — 20 lần mỗi giờ.</summary>
    public const string FileUpload = "file-upload";

    /// <summary>Tìm kiếm phòng công khai — 60 lần mỗi phút.</summary>
    public const string PublicSearch = "public-search";
}
