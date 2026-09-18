using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Infrastructure.Persistence;

/// <summary>
/// DbContext của hệ thống. Quy ước đặt tên snake_case được cấu hình ở
/// <see cref="DependencyInjection.AddInfrastructure"/> thông qua UseSnakeCaseNamingConvention.
/// </summary>
public class AppDbContext : IdentityDbContext<AppUser, AppRole, long>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // Các DbSet nghiệp vụ được bổ sung khi hiện thực từng nhóm chức năng,
    // theo đúng thiết kế trong docs/database-design.md.

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<AppUser>(entity =>
        {
            entity.ToTable("users");
            entity.Property(u => u.FullName).IsRequired();
        });

        builder.Entity<AppRole>(entity => entity.ToTable("roles"));
    }
}
