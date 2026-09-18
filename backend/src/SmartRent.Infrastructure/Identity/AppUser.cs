using Microsoft.AspNetCore.Identity;

namespace SmartRent.Infrastructure.Identity;

/// <summary>
/// Tài khoản người dùng. Các cột kỹ thuật (password hash, security stamp...)
/// do ASP.NET Identity quản lý; các cột dưới đây là dữ liệu nghiệp vụ.
/// </summary>
public class AppUser : IdentityUser<long>
{
    public string FullName { get; set; } = string.Empty;

    public bool IsLocked { get; set; }

    /// <summary>Bắt buộc có giá trị khi <see cref="IsLocked"/> là true.</summary>
    public string? LockReason { get; set; }

    public DateTimeOffset RegisteredAt { get; set; }
}
