using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SmartRent.Infrastructure.Email;
using SmartRent.Infrastructure.Persistence;
using SmartRent.Infrastructure.Storage;

namespace SmartRent.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Đăng ký tầng truy cập dữ liệu và các dịch vụ ngoài.
    /// Mọi secret KHÔNG nằm trong source code — xem docs/security-design.md mục 5.3.
    /// </summary>
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Thieu ConnectionStrings:DefaultConnection. " +
                "Khi phat trien, dat bang: dotnet user-secrets set \"ConnectionStrings:DefaultConnection\" \"...\"");
        }

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString)
                   .UseSnakeCaseNamingConvention());

        services.Configure<SupabaseStorageOptions>(
            configuration.GetSection(SupabaseStorageOptions.SectionName));

        services.AddHttpClient<IFileStorage, SupabaseStorageClient>();

        services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.SectionName));
        services.AddScoped<IEmailSender, SmtpEmailSender>();

        return services;
    }
}
