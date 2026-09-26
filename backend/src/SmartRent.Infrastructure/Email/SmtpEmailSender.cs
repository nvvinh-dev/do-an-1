using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

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

public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default);
}

public class SmtpEmailSender : IEmailSender
{
    private readonly SmtpOptions _options;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IOptions<SmtpOptions> options, ILogger<SmtpEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(
        string toEmail,
        string subject,
        string htmlBody,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.User) || string.IsNullOrWhiteSpace(_options.AppPassword))
        {
            throw new InvalidOperationException(
                "Thieu Smtp:User hoac Smtp:AppPassword. " +
                "Dat bang: dotnet user-secrets set \"Smtp:User\" \"...\"");
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_options.FromName, _options.User));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;
        message.Body = new BodyBuilder { HtmlBody = htmlBody }.ToMessageBody();

        using var client = new SmtpClient();

        await client.ConnectAsync(_options.Host, _options.Port, SecureSocketOptions.StartTls, cancellationToken);
        await client.AuthenticateAsync(_options.User, _options.AppPassword, cancellationToken);
        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);

        // Không ghi nội dung email vào log — nó chứa mã đặt lại mật khẩu.
        _logger.LogInformation("Da gui email {Subject}", subject);
    }
}
