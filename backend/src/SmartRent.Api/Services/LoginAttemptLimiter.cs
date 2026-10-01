using Microsoft.Extensions.Caching.Memory;

namespace SmartRent.Api.Services;

/// <summary>
/// Giới hạn đăng nhập sai theo docs/security-design.md mục 6: 5 lần SAI liên tiếp trong
/// 15 phút, tính theo cặp email + IP. Chỉ lần sai bị đếm; đăng nhập đúng xóa bộ đếm.
/// Email không tồn tại cũng bị đếm như mọi email khác, nên phản hồi 429 không cho biết
/// email có trong hệ thống hay không.
/// Bộ đếm nằm trong bộ nhớ của tiến trình và mất khi ứng dụng khởi động lại.
/// </summary>
public class LoginAttemptLimiter
{
    private const int MaxFailedAttempts = 5;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(15);

    private readonly IMemoryCache _cache;
    private readonly ILogger<LoginAttemptLimiter> _logger;

    public LoginAttemptLimiter(IMemoryCache cache, ILogger<LoginAttemptLimiter> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    /// <summary>Thời gian còn phải chờ nếu cặp email + IP đang bị chặn; null nếu không bị chặn.</summary>
    public TimeSpan? GetBlockedFor(string email, string ip)
    {
        if (!_cache.TryGetValue(Key(email, ip), out FailureCounter? counter)
            || counter!.Count < MaxFailedAttempts)
        {
            return null;
        }

        var remaining = counter.WindowEndsAt - DateTimeOffset.UtcNow;
        return remaining > TimeSpan.Zero ? remaining : null;
    }

    public void RegisterFailure(string email, string ip)
    {
        var counter = _cache.GetOrCreate(Key(email, ip), entry =>
        {
            var windowEndsAt = DateTimeOffset.UtcNow.Add(Window);
            entry.AbsoluteExpiration = windowEndsAt;
            return new FailureCounter(windowEndsAt);
        })!;

        if (counter.Increment() == MaxFailedAttempts)
        {
            // Ghi log để Admin đối chiếu khi nghi ngờ tài khoản bị tấn công.
            _logger.LogWarning(
                "Dang nhap sai {Count} lan lien tiep cho email {Email} tu IP {Ip}; tam chan 15 phut",
                MaxFailedAttempts, email, ip);
        }
    }

    public void Reset(string email, string ip) => _cache.Remove(Key(email, ip));

    private static string Key(string email, string ip)
        => $"login-failures:{email.Trim().ToLowerInvariant()}|{ip}";

    private sealed class FailureCounter(DateTimeOffset windowEndsAt)
    {
        private int _count;

        public DateTimeOffset WindowEndsAt { get; } = windowEndsAt;

        public int Count => Volatile.Read(ref _count);

        public int Increment() => Interlocked.Increment(ref _count);
    }
}
