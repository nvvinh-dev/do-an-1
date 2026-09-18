namespace SmartRent.Api;

/// <summary>
/// Tên các policy rate limiting. Ngưỡng cụ thể xem docs/security-design.md mục 6.
/// Gắn vào endpoint bằng thuộc tính [EnableRateLimiting(RateLimitPolicies.X)].
/// </summary>
public static class RateLimitPolicies
{
    /// <summary>Đăng nhập — 5 lần mỗi 15 phút.</summary>
    public const string AuthLogin = "auth-login";

    /// <summary>Đăng ký, quên mật khẩu, đặt lại mật khẩu — 3 lần mỗi giờ.</summary>
    public const string AuthAccount = "auth-account";

    /// <summary>Gửi yêu cầu thuê, báo đã thanh toán, nộp hồ sơ Chủ trọ — 10 lần mỗi giờ.</summary>
    public const string BusinessWrite = "business-write";

    /// <summary>Tìm kiếm phòng công khai — 60 lần mỗi phút.</summary>
    public const string PublicSearch = "public-search";
}
