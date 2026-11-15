using Microsoft.Extensions.Caching.Memory;

namespace SmartRent.Api.Services;

/// <summary>
/// Giới hạn đăng nhập sai theo docs/security-design.md mục 6: 5 lần SAI liên tiếp trong
/// 15 phút, tính theo cặp email + IP. Email không tồn tại cũng bị đếm như mọi email khác,
/// nên phản hồi 429 không cho biết email có trong hệ thống hay không.
///
/// Mỗi lần đăng nhập giữ chỗ một lượt TRƯỚC khi kiểm tra mật khẩu: các request gửi song song
/// không thể cùng lọt qua bước chặn. Đăng nhập đúng thì bộ đếm được xóa, nên chỉ lần sai
/// mới thực sự bị tính. Bộ đếm nằm trong bộ nhớ của tiến trình và mất khi ứng dụng khởi động lại.
/// </summary>
public class LoginAttemptLimiter
{
    private const int MaxFailedAttempts = 5;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(15);

    private readonly IMemoryCache _cache;
    private readonly ILogger<LoginAttemptLimiter> _logger;

    /// <summary>Tạo và tăng bộ đếm dưới cùng một khóa, để hai request song song không tạo hai bộ đếm.</summary>
    private readonly Lock _sync = new();

    public LoginAttemptLimiter(IMemoryCache cache, ILogger<LoginAttemptLimiter> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    /// <summary>
    /// Giữ chỗ một lượt đăng nhập. Trả về false khi cặp email + IP đã dùng hết lượt;
    /// khi đó <paramref name="retryAfter"/> là thời gian còn phải chờ.
    /// </summary>
    public bool TryReserveAttempt(string email, string ip, out TimeSpan retryAfter)
    {
        var key = Key(email, ip);
        int count;
        DateTimeOffset windowEndsAt;

        lock (_sync)
        {
            if (!_cache.TryGetValue(key, out FailureCounter? counter) || counter is null)
            {
                counter = new FailureCounter(DateTimeOffset.UtcNow.Add(Window));
                _cache.Set(key, counter, counter.WindowEndsAt);
            }

            count = ++counter.Count;
            windowEndsAt = counter.WindowEndsAt;
        }

        if (count <= MaxFailedAttempts)
        {
            retryAfter = TimeSpan.Zero;
            return true;
        }

        if (count == MaxFailedAttempts + 1)
        {
            // Ghi log để Admin đối chiếu khi nghi ngờ tài khoản bị tấn công.
            _logger.LogWarning(
                "Dang nhap sai {Count} lan lien tiep cho email {Email} tu IP {Ip}; tam chan 15 phut",
                MaxFailedAttempts, email, ip);
        }

        var remaining = windowEndsAt - DateTimeOffset.UtcNow;
        retryAfter = remaining > TimeSpan.Zero ? remaining : TimeSpan.FromSeconds(1);
        return false;
    }

    /// <summary>Đăng nhập đúng thì xóa bộ đếm — lượt đã giữ chỗ không bị tính là lần sai.</summary>
    public void Reset(string email, string ip)
    {
        lock (_sync)
        {
            _cache.Remove(Key(email, ip));
        }
    }

    private static string Key(string email, string ip)
        => $"login-failures:{email.Trim().ToLowerInvariant()}|{ip}";

    private sealed class FailureCounter(DateTimeOffset windowEndsAt)
    {
        public DateTimeOffset WindowEndsAt { get; } = windowEndsAt;

        /// <summary>Chỉ đọc và ghi bên trong khóa <see cref="_sync"/>.</summary>
        public int Count { get; set; }
    }
}
