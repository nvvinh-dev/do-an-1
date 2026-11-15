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

    /// <summary>
    /// Tài khoản nhận tiền của Chủ trọ (BR-26). Ba cột cùng có giá trị hoặc cùng null;
    /// null thì hệ thống không hiển thị mã VietQR.
    /// </summary>
    /// <remarks>Mã BIN 6 chữ số của ngân hàng theo chuẩn VietQR.</remarks>
    public string? BankBin { get; set; }

    public string? BankAccountNumber { get; set; }

    /// <summary>Tên chủ tài khoản, viết hoa không dấu.</summary>
    public string? BankAccountName { get; set; }
}
