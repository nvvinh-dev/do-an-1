namespace SmartRent.Infrastructure.Email;

public class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; set; } = "smtp.gmail.com";

    public int Port { get; set; } = 587;

    /// <summary>Địa chỉ Gmail dùng để gửi.</summary>
    public string User { get; set; } = string.Empty;

    /// <summary>App password 16 ký tự của Google, không phải mật khẩu Gmail thường.</summary>
    public string AppPassword { get; set; } = string.Empty;

    public string FromName { get; set; } = "SmartRent";
}
