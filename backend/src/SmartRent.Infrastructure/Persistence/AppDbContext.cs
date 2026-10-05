using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Infrastructure.Persistence;

/// <summary>
/// DbContext của hệ thống. Quy ước đặt tên snake_case được cấu hình ở
/// <see cref="DependencyInjection.AddInfrastructure"/> thông qua UseSnakeCaseNamingConvention,
/// nên phần dưới đây chỉ khai báo kiểu dữ liệu, ràng buộc, quan hệ và chỉ mục.
/// </summary>
public class AppDbContext : IdentityDbContext<AppUser, AppRole, long>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<LandlordApplication> LandlordApplications => Set<LandlordApplication>();
    public DbSet<Property> Properties => Set<Property>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<RoomServiceFee> RoomServiceFees => Set<RoomServiceFee>();
    public DbSet<Amenity> Amenities => Set<Amenity>();
    public DbSet<PropertyAmenity> PropertyAmenities => Set<PropertyAmenity>();
    public DbSet<RoomAmenity> RoomAmenities => Set<RoomAmenity>();
    public DbSet<PropertyImage> PropertyImages => Set<PropertyImage>();
    public DbSet<RoomImage> RoomImages => Set<RoomImage>();
    public DbSet<RentalRequest> RentalRequests => Set<RentalRequest>();
    public DbSet<Contract> Contracts => Set<Contract>();
    public DbSet<ContractServiceFee> ContractServiceFees => Set<ContractServiceFee>();
    public DbSet<ContractOccupant> ContractOccupants => Set<ContractOccupant>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceLine> InvoiceLines => Set<InvoiceLine>();
    public DbSet<PaymentReport> PaymentReports => Set<PaymentReport>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    /// <summary>Số tiền: numeric(14,2).</summary>
    private const string Money = "numeric(14,2)";

    /// <summary>Chỉ số điện nước: numeric(12,2).</summary>
    private const string MeterIndex = "numeric(12,2)";

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        ConfigureIdentity(builder);
        ConfigureLandlordApplications(builder);
        ConfigureProperties(builder);
        ConfigureRooms(builder);
        ConfigureAmenities(builder);
        ConfigureImages(builder);
        ConfigureRentalRequests(builder);
        ConfigureContracts(builder);
        ConfigureInvoices(builder);
        ConfigureNotificationsAndAuditLogs(builder);
    }

    // ------------------------------------------------------------- Identity

    private static void ConfigureIdentity(ModelBuilder builder)
    {
        builder.Entity<AppUser>(entity =>
        {
            entity.ToTable("users", t => t.HasCheckConstraint(
                "ck_users_bank_account",
                "(bank_bin IS NULL AND bank_account_number IS NULL AND bank_account_name IS NULL) OR " +
                "(bank_bin IS NOT NULL AND bank_account_number IS NOT NULL AND bank_account_name IS NOT NULL)"));

            entity.Property(u => u.FullName).IsRequired();
        });

        builder.Entity<AppRole>(entity => entity.ToTable("roles"));

        // Identity đặt sẵn tên PascalCase cho các bảng phụ nên quy ước snake_case
        // không tự áp dụng được — phải đổi tên tường minh.
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserRole<long>>()
               .ToTable("user_roles");

        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserClaim<long>>()
               .ToTable("user_claims");

        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserLogin<long>>()
               .ToTable("user_logins");

        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserToken<long>>()
               .ToTable("user_tokens");

        builder.Entity<Microsoft.AspNetCore.Identity.IdentityRoleClaim<long>>()
               .ToTable("role_claims");
    }

    // ---------------------------------------------------- Hồ sơ Chủ trọ

    private static void ConfigureLandlordApplications(ModelBuilder builder)
    {
        builder.Entity<LandlordApplication>(entity =>
        {
            entity.Property(a => a.IdCardNumber).IsRequired();
            entity.Property(a => a.IdCardFrontUrl).IsRequired();
            entity.Property(a => a.IdCardBackUrl).IsRequired();
            entity.Property(a => a.OwnershipDocumentUrl).IsRequired();
            entity.Property(a => a.Status).HasConversion<string>().IsRequired();

            entity.ToTable(t => t.HasCheckConstraint(
                "ck_landlord_applications_status",
                $"status IN ({EnumValues<LandlordApplicationStatus>()})"));

            entity.HasOne<AppUser>()
                  .WithMany()
                  .HasForeignKey(a => a.UserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<AppUser>()
                  .WithMany()
                  .HasForeignKey(a => a.ReviewedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(a => new { a.UserId, a.Status });

            // FR-07: mỗi người chỉ có tối đa một hồ sơ chờ duyệt — chặn cả hai lượt nộp gửi cùng lúc.
            entity.HasIndex(a => a.UserId)
                  .IsUnique()
                  .HasFilter("status = 'ChoDuyet'")
                  .HasDatabaseName("ux_landlord_applications_user_cho_duyet");
        });
    }

    // -------------------------------------------------------------- Khu trọ

    private static void ConfigureProperties(ModelBuilder builder)
    {
        builder.Entity<Property>(entity =>
        {
            entity.Property(p => p.Name).IsRequired();
            entity.Property(p => p.Address).IsRequired();
            entity.Property(p => p.Ward).IsRequired();
            entity.Property(p => p.City).IsRequired();
            entity.Property(p => p.Status).HasConversion<string>().IsRequired();

            entity.ToTable(t => t.HasCheckConstraint(
                "ck_properties_status",
                $"status IN ({EnumValues<PropertyStatus>()})"));

            entity.HasOne<AppUser>()
                  .WithMany()
                  .HasForeignKey(p => p.LandlordUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Phân quyền theo sở hữu
            entity.HasIndex(p => p.LandlordUserId);

            // Bộ lọc khu vực
            entity.HasIndex(p => new { p.City, p.Ward });
        });
    }

    // --------------------------------------------------------------- Phòng

    private static void ConfigureRooms(ModelBuilder builder)
    {
        builder.Entity<Room>(entity =>
        {
            entity.Property(r => r.Code).IsRequired();
            entity.Property(r => r.Area).HasColumnType("numeric(8,2)");
            entity.Property(r => r.RentPrice).HasColumnType(Money);
            entity.Property(r => r.ElectricityUnitPrice).HasColumnType(Money);
            entity.Property(r => r.WaterUnitPrice).HasColumnType(Money);
            entity.Property(r => r.OccupancyStatus).HasConversion<string>().IsRequired();
            entity.Property(r => r.VisibilityStatus).HasConversion<string>().IsRequired();

            entity.ToTable(t =>
            {
                t.HasCheckConstraint(
                    "ck_rooms_occupancy_status",
                    $"occupancy_status IN ({EnumValues<RoomOccupancyStatus>()})");

                t.HasCheckConstraint(
                    "ck_rooms_visibility_status",
                    $"visibility_status IN ({EnumValues<RoomVisibilityStatus>()})");
            });

            entity.HasOne(r => r.Property)
                  .WithMany(p => p.Rooms)
                  .HasForeignKey(r => r.PropertyId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Mã phòng duy nhất trong một khu trọ
            entity.HasIndex(r => new { r.PropertyId, r.Code }).IsUnique();

            // Điều kiện hiển thị trong kết quả tìm kiếm
            entity.HasIndex(r => new { r.OccupancyStatus, r.VisibilityStatus });

            // Bộ lọc tìm kiếm
            entity.HasIndex(r => r.RentPrice);
            entity.HasIndex(r => r.Area);
            entity.HasIndex(r => r.MaxOccupants);
        });

        builder.Entity<RoomServiceFee>(entity =>
        {
            entity.Property(f => f.Name).IsRequired();
            entity.Property(f => f.Amount).HasColumnType(Money);

            entity.HasOne(f => f.Room)
                  .WithMany(r => r.ServiceFees)
                  .HasForeignKey(f => f.RoomId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }

    // ------------------------------------------------------------ Tiện ích

    private static void ConfigureAmenities(ModelBuilder builder)
    {
        builder.Entity<Amenity>(entity =>
        {
            entity.Property(a => a.Name).IsRequired();
            entity.Property(a => a.Scope).HasConversion<string>().IsRequired();

            entity.ToTable(t => t.HasCheckConstraint(
                "ck_amenities_scope",
                $"scope IN ({EnumValues<AmenityScope>()})"));

            entity.HasIndex(a => a.Name).IsUnique();
        });

        builder.Entity<PropertyAmenity>(entity =>
        {
            entity.HasKey(pa => new { pa.PropertyId, pa.AmenityId });

            entity.HasOne(pa => pa.Property)
                  .WithMany(p => p.Amenities)
                  .HasForeignKey(pa => pa.PropertyId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(pa => pa.Amenity)
                  .WithMany()
                  .HasForeignKey(pa => pa.AmenityId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<RoomAmenity>(entity =>
        {
            entity.HasKey(ra => new { ra.RoomId, ra.AmenityId });

            entity.HasOne(ra => ra.Room)
                  .WithMany(r => r.Amenities)
                  .HasForeignKey(ra => ra.RoomId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ra => ra.Amenity)
                  .WithMany()
                  .HasForeignKey(ra => ra.AmenityId)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }

    // ---------------------------------------------------------------- Ảnh

    private static void ConfigureImages(ModelBuilder builder)
    {
        builder.Entity<PropertyImage>(entity =>
        {
            entity.Property(i => i.Url).IsRequired();

            entity.HasOne(i => i.Property)
                  .WithMany(p => p.Images)
                  .HasForeignKey(i => i.PropertyId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<RoomImage>(entity =>
        {
            entity.Property(i => i.Url).IsRequired();

            entity.HasOne(i => i.Room)
                  .WithMany(r => r.Images)
                  .HasForeignKey(i => i.RoomId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }

    // ------------------------------------------------------- Yêu cầu thuê

    private static void ConfigureRentalRequests(ModelBuilder builder)
    {
        builder.Entity<RentalRequest>(entity =>
        {
            entity.Property(r => r.Status).HasConversion<string>().IsRequired();

            entity.ToTable(t => t.HasCheckConstraint(
                "ck_rental_requests_status",
                $"status IN ({EnumValues<RentalRequestStatus>()})"));

            entity.HasOne(r => r.Room)
                  .WithMany()
                  .HasForeignKey(r => r.RoomId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<AppUser>()
                  .WithMany()
                  .HasForeignKey(r => r.TenantUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Tìm các yêu cầu cùng phòng đang chờ duyệt để tự từ chối
            entity.HasIndex(r => new { r.RoomId, r.Status });

            entity.HasIndex(r => r.TenantUserId);

            // BR-27: mỗi người thuê chỉ có một yêu cầu chờ duyệt cho mỗi phòng — chặn cả hai lượt gửi cùng lúc.
            entity.HasIndex(r => new { r.RoomId, r.TenantUserId }, "ux_rental_requests_room_tenant_cho_duyet")
                  .IsUnique()
                  .HasFilter("status = 'ChoDuyet'")
                  .HasDatabaseName("ux_rental_requests_room_tenant_cho_duyet");

            // BR-28: mỗi người thuê chỉ giữ một phòng — chặn hai lượt duyệt gửi gần như đồng thời.
            // Đặt tên riêng để cùng tồn tại với chỉ mục thường trên tenant_user_id ở trên.
            entity.HasIndex(r => r.TenantUserId, "ux_rental_requests_tenant_da_duyet")
                  .IsUnique()
                  .HasFilter("status = 'DaDuyet'")
                  .HasDatabaseName("ux_rental_requests_tenant_da_duyet");

            ConfigureRowVersion(entity);
        });
    }

    // ----------------------------------------------------------- Hợp đồng

    private static void ConfigureContracts(ModelBuilder builder)
    {
        builder.Entity<Contract>(entity =>
        {
            entity.Property(c => c.RentPrice).HasColumnType(Money);
            entity.Property(c => c.ElectricityUnitPrice).HasColumnType(Money);
            entity.Property(c => c.WaterUnitPrice).HasColumnType(Money);
            entity.Property(c => c.DepositAmount).HasColumnType(Money);
            entity.Property(c => c.DepositRefundedAmount).HasColumnType(Money);
            entity.Property(c => c.InitialElectricityIndex).HasColumnType(MeterIndex);
            entity.Property(c => c.InitialWaterIndex).HasColumnType(MeterIndex);
            entity.Property(c => c.Status).HasConversion<string>().IsRequired();
            entity.Property(c => c.DepositReceivedMethod).HasConversion<string>();
            entity.Property(c => c.DepositRefundMethod).HasConversion<string>();

            entity.ToTable(t =>
            {
                t.HasCheckConstraint(
                    "ck_contracts_status",
                    $"status IN ({EnumValues<ContractStatus>()})");

                t.HasCheckConstraint(
                    "ck_contracts_deposit_received_method",
                    $"deposit_received_method IN ({EnumValues<PaymentMethod>()})");

                t.HasCheckConstraint(
                    "ck_contracts_deposit_refund_method",
                    $"deposit_refund_method IN ({EnumValues<PaymentMethod>()})");
            });

            entity.HasOne(c => c.Room)
                  .WithMany()
                  .HasForeignKey(c => c.RoomId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<AppUser>()
                  .WithMany()
                  .HasForeignKey(c => c.TenantUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(c => c.RentalRequest)
                  .WithMany()
                  .HasForeignKey(c => c.RentalRequestId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<AppUser>()
                  .WithMany()
                  .HasForeignKey(c => c.CancelledByUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<AppUser>()
                  .WithMany()
                  .HasForeignKey(c => c.MoveOutNoticeByUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            ConfigureRowVersion(entity);

            // Một phòng chỉ có tối đa một hợp đồng đang chiếm dụng tại một thời điểm
            entity.HasIndex(c => c.RoomId)
                  .IsUnique()
                  .HasFilter("status IN ('DangHieuLuc', 'SapHetHan', 'DangThanhLy')")
                  .HasDatabaseName("ux_contracts_room_dang_chiem_dung");

            entity.HasIndex(c => c.TenantUserId);
        });

        builder.Entity<ContractServiceFee>(entity =>
        {
            entity.Property(f => f.Name).IsRequired();
            entity.Property(f => f.Amount).HasColumnType(Money);

            entity.HasOne(f => f.Contract)
                  .WithMany(c => c.ServiceFees)
                  .HasForeignKey(f => f.ContractId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<ContractOccupant>(entity =>
        {
            entity.Property(o => o.FullName).IsRequired();

            entity.HasOne(o => o.Contract)
                  .WithMany(c => c.Occupants)
                  .HasForeignKey(o => o.ContractId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }

    // ------------------------------------------------------------ Hóa đơn

    private static void ConfigureInvoices(ModelBuilder builder)
    {
        builder.Entity<Invoice>(entity =>
        {
            entity.Property(i => i.Type).HasConversion<string>().IsRequired();
            entity.Property(i => i.Status).HasConversion<string>().IsRequired();

            entity.Property(i => i.PreviousElectricityIndex).HasColumnType(MeterIndex);
            entity.Property(i => i.CurrentElectricityIndex).HasColumnType(MeterIndex);
            entity.Property(i => i.PreviousWaterIndex).HasColumnType(MeterIndex);
            entity.Property(i => i.CurrentWaterIndex).HasColumnType(MeterIndex);

            entity.Property(i => i.ElectricityUnitPrice).HasColumnType(Money);
            entity.Property(i => i.ElectricityAmount).HasColumnType(Money);
            entity.Property(i => i.WaterUnitPrice).HasColumnType(Money);
            entity.Property(i => i.WaterAmount).HasColumnType(Money);
            entity.Property(i => i.RentAmount).HasColumnType(Money);
            entity.Property(i => i.ServiceFeeAmount).HasColumnType(Money);
            entity.Property(i => i.TotalAmount).HasColumnType(Money);
            entity.Property(i => i.PaidAmount).HasColumnType(Money);

            entity.ToTable(t =>
            {
                t.HasCheckConstraint(
                    "ck_invoices_type",
                    $"type IN ({EnumValues<InvoiceType>()})");

                t.HasCheckConstraint(
                    "ck_invoices_status",
                    $"status IN ({EnumValues<InvoiceStatus>()})");

                // Chỉ số mới không được nhỏ hơn chỉ số cũ
                t.HasCheckConstraint(
                    "ck_invoices_chi_so_dien",
                    "current_electricity_index >= previous_electricity_index");

                t.HasCheckConstraint(
                    "ck_invoices_chi_so_nuoc",
                    "current_water_index >= previous_water_index");
            });

            entity.HasOne(i => i.Contract)
                  .WithMany(c => c.Invoices)
                  .HasForeignKey(i => i.ContractId)
                  .OnDelete(DeleteBehavior.Restrict);

            // BR-17: mỗi hợp đồng chỉ có một hóa đơn định kỳ chưa hủy cho mỗi kỳ —
            // hóa đơn đã hủy không chặn việc lập lại kỳ đó.
            entity.HasIndex(i => new { i.ContractId, i.PeriodStart, i.PeriodEnd })
                  .IsUnique()
                  .HasFilter("type = 'DinhKy' AND status <> 'DaHuy'")
                  .HasDatabaseName("ux_invoices_contract_ky_dinh_ky");

            // FR-54: mỗi hợp đồng tối đa một hóa đơn thanh lý.
            // Đặt tên riêng để không trùng chỉ mục khóa ngoại trên contract_id.
            entity.HasIndex(i => i.ContractId, "ux_invoices_contract_thanh_ly")
                  .IsUnique()
                  .HasFilter("type = 'ThanhLy'")
                  .HasDatabaseName("ux_invoices_contract_thanh_ly");

            // Quét hóa đơn quá hạn
            entity.HasIndex(i => new { i.Status, i.DueDate });
        });

        builder.Entity<InvoiceLine>(entity =>
        {
            entity.Property(l => l.Category).HasConversion<string>().IsRequired();
            entity.Property(l => l.Description).IsRequired();
            entity.Property(l => l.Amount).HasColumnType(Money);

            entity.ToTable(t => t.HasCheckConstraint(
                "ck_invoice_lines_category",
                $"category IN ({EnumValues<InvoiceLineCategory>()})"));

            entity.HasOne(l => l.Invoice)
                  .WithMany(i => i.Lines)
                  .HasForeignKey(l => l.InvoiceId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(l => l.RelatedInvoice)
                  .WithMany()
                  .HasForeignKey(l => l.RelatedInvoiceId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<PaymentReport>(entity =>
        {
            entity.Property(p => p.ProofImageUrl).IsRequired();
            entity.Property(p => p.Status).HasConversion<string>().IsRequired();
            entity.Property(p => p.ReportedAmount).HasColumnType(Money);
            entity.Property(p => p.ConfirmedAmount).HasColumnType(Money);

            entity.ToTable(t => t.HasCheckConstraint(
                "ck_payment_reports_status",
                $"status IN ({EnumValues<PaymentReportStatus>()})"));

            entity.HasOne(p => p.Invoice)
                  .WithMany(i => i.PaymentReports)
                  .HasForeignKey(p => p.InvoiceId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne<AppUser>()
                  .WithMany()
                  .HasForeignKey(p => p.ConfirmedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }

    // ------------------------------------------- Thông báo và nhật ký

    private static void ConfigureNotificationsAndAuditLogs(ModelBuilder builder)
    {
        builder.Entity<Notification>(entity =>
        {
            entity.Property(n => n.EventType).IsRequired();
            entity.Property(n => n.Title).IsRequired();
            entity.Property(n => n.Content).IsRequired();

            entity.HasOne<AppUser>()
                  .WithMany()
                  .HasForeignKey(n => n.RecipientUserId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Đếm thông báo chưa đọc
            entity.HasIndex(n => new { n.RecipientUserId, n.IsRead });
        });

        builder.Entity<AuditLog>(entity =>
        {
            entity.Property(a => a.Action).IsRequired();
            entity.Property(a => a.EntityType).IsRequired();
            entity.Property(a => a.OldValue).HasColumnType("jsonb");
            entity.Property(a => a.NewValue).HasColumnType("jsonb");

            entity.HasOne<AppUser>()
                  .WithMany()
                  .HasForeignKey(a => a.ActorUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Tra cứu khi xử lý khiếu nại
            entity.HasIndex(a => new { a.EntityType, a.EntityId });
        });
    }

    /// <summary>
    /// Dùng cột hệ thống xmin của PostgreSQL làm concurrency token: hai thao tác cùng đổi trạng thái
    /// một bản ghi (duyệt và rút một yêu cầu thuê, thu hồi và xác nhận một hợp đồng...) không ghi đè nhau —
    /// bên lưu sau nhận DbUpdateConcurrencyException. xmin có sẵn trên mọi bảng nên không sinh cột mới.
    /// </summary>
    private static void ConfigureRowVersion<TEntity>(EntityTypeBuilder<TEntity> entity) where TEntity : class
        => entity.Property<uint>("RowVersion")
                 .HasColumnName("xmin")
                 .HasColumnType("xid")
                 .IsRowVersion();

    /// <summary>
    /// Sinh danh sách giá trị hợp lệ của một enum để dùng trong ràng buộc CHECK.
    /// Thêm hoặc bớt giá trị trong enum sẽ tự sinh migration cập nhật ràng buộc.
    /// </summary>
    private static string EnumValues<TEnum>() where TEnum : struct, Enum
        => string.Join(", ", Enum.GetNames<TEnum>().Select(name => $"'{name}'"));
}
