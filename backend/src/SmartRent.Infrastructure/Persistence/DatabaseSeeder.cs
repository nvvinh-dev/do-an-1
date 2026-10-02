using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Infrastructure.Persistence;

/// <summary>
/// Khởi tạo dữ liệu nền tối thiểu để hệ thống chạy được.
/// Chạy mỗi lần ứng dụng khởi động và không làm gì nếu dữ liệu đã tồn tại.
/// </summary>
public static class DatabaseSeeder
{
    public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var provider = scope.ServiceProvider;

        var logger = provider.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(DatabaseSeeder));
        var configuration = provider.GetRequiredService<IConfiguration>();

        await SeedRolesAsync(provider, logger);
        await SeedAdminAsync(provider, configuration, logger);
        await SeedAmenitiesAsync(provider, logger, cancellationToken);
    }

    /// <summary>Ba vai trò của hệ thống. Không có chúng thì đăng ký tài khoản không gán được vai trò.</summary>
    private static async Task SeedRolesAsync(IServiceProvider provider, ILogger logger)
    {
        var roleManager = provider.GetRequiredService<RoleManager<AppRole>>();

        foreach (var roleName in new[] { AppRoles.Admin, AppRoles.Landlord, AppRoles.Tenant })
        {
            if (await roleManager.RoleExistsAsync(roleName))
            {
                continue;
            }

            var result = await roleManager.CreateAsync(new AppRole { Name = roleName });

            if (result.Succeeded)
            {
                logger.LogInformation("Da tao vai tro {Role}", roleName);
            }
            else
            {
                logger.LogError("Khong tao duoc vai tro {Role}: {Errors}",
                    roleName, string.Join("; ", result.Errors.Select(e => e.Description)));
            }
        }
    }

    /// <summary>
    /// Tài khoản Admin đầu tiên. Không ai tự đăng ký làm Admin được nên tài khoản này
    /// phải được tạo từ cấu hình. Thông tin đăng nhập lấy từ User Secrets, không nằm trong source code.
    /// Thiếu cấu hình thì bỏ qua — tuyệt đối không tạo Admin với mật khẩu mặc định.
    /// </summary>
    private static async Task SeedAdminAsync(IServiceProvider provider, IConfiguration configuration, ILogger logger)
    {
        var email = configuration["Seed:AdminEmail"];
        var password = configuration["Seed:AdminPassword"];
        var fullName = configuration["Seed:AdminFullName"] ?? "Quản trị viên";

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning(
                "Bo qua tao tai khoan Admin vi thieu Seed:AdminEmail hoac Seed:AdminPassword. " +
                "Dat bang: dotnet user-secrets set \"Seed:AdminEmail\" \"...\"");
            return;
        }

        var userManager = provider.GetRequiredService<UserManager<AppUser>>();

        if (await userManager.FindByEmailAsync(email) is not null)
        {
            return;
        }

        var admin = new AppUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            FullName = fullName,
            IsLocked = false,
            RegisteredAt = DateTimeOffset.UtcNow
        };

        var created = await userManager.CreateAsync(admin, password);

        if (!created.Succeeded)
        {
            logger.LogError("Khong tao duoc tai khoan Admin: {Errors}",
                string.Join("; ", created.Errors.Select(e => e.Description)));
            return;
        }

        await userManager.AddToRoleAsync(admin, AppRoles.Admin);
        logger.LogInformation("Da tao tai khoan Admin {Email}", email);
    }

    /// <summary>
    /// Danh mục tiện ích phục vụ bộ lọc tìm kiếm. Chỉ nạp khi bảng còn trống,
    /// nên sửa hoặc bổ sung trực tiếp trong database sẽ không bị ghi đè.
    /// </summary>
    private static async Task SeedAmenitiesAsync(
        IServiceProvider provider,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var db = provider.GetRequiredService<AppDbContext>();

        if (await db.Amenities.AnyAsync(cancellationToken))
        {
            return;
        }

        string[] propertyAmenities =
        [
            "Bãi để xe", "Thang máy", "Bảo vệ 24/7", "Camera an ninh", "Máy giặt chung", "Sân phơi"
        ];

        string[] roomAmenities =
        [
            "Máy lạnh", "Nóng lạnh", "Wifi", "Gác lửng", "Ban công",
            "Nhà vệ sinh riêng", "Bếp riêng", "Tủ lạnh", "Giường", "Tủ quần áo"
        ];

        db.Amenities.AddRange(propertyAmenities.Select(name => new Amenity
        {
            Name = name,
            Scope = AmenityScope.KhuTro
        }));

        db.Amenities.AddRange(roomAmenities.Select(name => new Amenity
        {
            Name = name,
            Scope = AmenityScope.Phong
        }));

        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Da nap {Count} tien ich vao danh muc",
            propertyAmenities.Length + roomAmenities.Length);
    }
}
