using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SmartRent.Infrastructure.Persistence;

namespace SmartRent.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Đăng ký tầng truy cập dữ liệu.
    /// Chuỗi kết nối KHÔNG nằm trong source code — xem docs/security-design.md mục 5.3.
    /// </summary>
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Thiếu ConnectionStrings:DefaultConnection. " +
                "Khi phát triển, đặt bằng: dotnet user-secrets set \"ConnectionStrings:DefaultConnection\" \"...\"");
        }

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString)
                   .UseSnakeCaseNamingConvention());

        return services;
    }
}
