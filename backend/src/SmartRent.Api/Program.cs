using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Serilog;
using SmartRent.Api;
using SmartRent.Api.Services;
using SmartRent.Api.Validators;
using SmartRent.Infrastructure;
using SmartRent.Infrastructure.Identity;
using SmartRent.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------- Logging
builder.Host.UseSerilog((context, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration)
                 .WriteTo.Console());

// ------------------------------------------------------------ Truy cập dữ liệu
builder.Services.AddInfrastructure(builder.Configuration);

// ---------------------------------------------------------------- Identity
builder.Services.AddIdentityCore<AppUser>(options =>
       {
           options.User.RequireUniqueEmail = true;
           options.Password.RequiredLength = 8;

           // Không dùng khóa tạm theo tài khoản của Identity: ai biết email cũng khóa được
           // tài khoản người khác. Giới hạn đăng nhập sai tính theo email + IP ở LoginAttemptLimiter.
           options.Lockout.AllowedForNewUsers = false;
       })
       .AddRoles<AppRole>()
       .AddEntityFrameworkStores<AppDbContext>()
       .AddDefaultTokenProviders();

// ------------------------------------------------------- Xác thực bằng JWT
// Khóa ký KHÔNG nằm trong source code — xem docs/security-design.md mục 5.3.
var jwtKey = builder.Configuration["Jwt:Key"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException(
        "Thiếu Jwt:Key. Khi phát triển, đặt bằng: dotnet user-secrets set \"Jwt:Key\" \"...\"");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
       .AddJwtBearer(options =>
       {
           options.TokenValidationParameters = new TokenValidationParameters
           {
               ValidateIssuer = true,
               ValidateAudience = true,
               ValidateLifetime = true,
               ValidateIssuerSigningKey = true,
               ValidIssuer = builder.Configuration["Jwt:Issuer"],
               ValidAudience = builder.Configuration["Jwt:Audience"],
               IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
               ClockSkew = TimeSpan.Zero
           };
       });

builder.Services.AddAuthorization();

// ------------------------------------------------------------ Rate limiting
// Ngưỡng theo docs/security-design.md mục 6. Riêng nhóm đăng nhập chỉ đếm lần SAI nên
// không dùng được middleware — xem LoginAttemptLimiter.
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<LoginAttemptLimiter>();

// Ngưỡng nhóm đăng ký / quên / đặt lại mật khẩu đặt ở cấu hình, để nâng được khi demo dùng chung mạng.
var authAccountPerHour = builder.Configuration.GetValue("RateLimiting:AuthAccountPerHour", 3);

// Ngưỡng nhóm gửi yêu cầu thuê, báo đã thanh toán, nộp hồ sơ Chủ trọ (security-design.md mục 6).
var businessWritePerHour = builder.Configuration.GetValue("RateLimiting:BusinessWritePerHour", 10);

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, cancellationToken) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter =
                ((int)retryAfter.TotalSeconds).ToString(CultureInfo.InvariantCulture);
        }

        // Trả về dạng ProblemDetails như mọi lỗi khác (api-design.md mục 1).
        // Không tiết lộ tài khoản có tồn tại hay không.
        await Results.Problem(
                detail: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
                statusCode: StatusCodes.Status429TooManyRequests)
            .ExecuteAsync(context.HttpContext);
    };

    // Mỗi endpoint một bộ đếm riêng: đăng ký, quên mật khẩu và đặt lại mật khẩu không dùng chung lượt.
    options.AddPolicy(RateLimitPolicies.AuthAccount, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"{context.Request.Path.Value?.ToLowerInvariant()}|{GetClientIp(context)}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = authAccountPerHour,
                Window = TimeSpan.FromHours(1)
            }));

    // Tính theo tài khoản đăng nhập. Id người dùng đọc từ claim "sub" của token,
    // nên middleware rate limiting phải chạy SAU UseAuthentication.
    // Mỗi endpoint của nhóm một bộ đếm riêng: gửi yêu cầu thuê không ăn lượt của nộp hồ sơ Chủ trọ.
    options.AddPolicy(RateLimitPolicies.BusinessWrite, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: GetUserId(context) is { } userId
                ? $"{GetRouteTemplate(context)}|user:{userId}"
                : $"{GetRouteTemplate(context)}|ip:{GetClientIp(context)}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = businessWritePerHour,
                Window = TimeSpan.FromHours(1)
            }));

    options.AddPolicy(RateLimitPolicies.FileUpload, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: GetUserId(context) is { } userId
                ? $"user:{userId}"
                : $"ip:{GetClientIp(context)}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromHours(1)
            }));

    // Tìm kiếm và chi tiết phòng công khai mỗi endpoint một bộ đếm; mọi id phòng đếm chung một bộ.
    options.AddPolicy(RateLimitPolicies.PublicSearch, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"{GetRouteTemplate(context)}|{GetClientIp(context)}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(1)
            }));
});

// ------------------------------------------------- Service nghiệp vụ
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<AuditLogService>();
builder.Services.AddScoped<LandlordApplicationService>();
builder.Services.AddScoped<LandlordBankAccountService>();
builder.Services.AddScoped<UserAdminService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<RentalRequestService>();
builder.Services.AddScoped<ContractService>();
builder.Services.AddScoped<SettlementService>();
builder.Services.AddScoped<PropertyService>();
builder.Services.AddScoped<RoomSearchService>();
builder.Services.AddSingleton<LocationCatalog>();

// Tác vụ định kỳ chạy mỗi giờ trong tiến trình API — docs/architecture.md mục 7.
builder.Services.AddHostedService<ScheduledTaskRunner>();

// ---------------------------------------------------------------- MVC + API
builder.Services.AddControllers()
       .AddJsonOptions(options =>
       {
           // Enum đi ra và đi vào dưới dạng TÊN trạng thái, không phải số thứ tự.
           // Database cũng lưu dạng text nên hai bên khớp nhau, và chèn thêm một giá trị
           // vào giữa enum sau này không làm lệch dữ liệu cũ.
           options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
       });

builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ConcurrencyConflictExceptionHandler>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "SmartRent API",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập token, không kèm tiền tố Bearer."
    });

    // Phải truyền document vào tham chiếu, nếu không khối "security" sinh ra sẽ rỗng
    // và Swagger UI không gắn header Authorization vào request.
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        { new OpenApiSecuritySchemeReference("Bearer", document), new List<string>() }
    });
});

var app = builder.Build();

// --------------------------------------------------- Dữ liệu nền
// Tạo 3 vai trò, tài khoản Admin đầu tiên và danh mục tiện ích nếu chưa có.
await DatabaseSeeder.SeedAsync(app.Services);

// Nạp danh mục tỉnh/thành – phường/xã ngay khi khởi động: thiếu hoặc hỏng file thì dừng luôn (README mục 12.1).
app.Services.GetRequiredService<LocationCatalog>();

// ------------------------------------------------------------ Pipeline
app.UseSerilogRequestLogging();
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();
app.MapControllers();

app.Run();

static string GetClientIp(HttpContext context)
    => context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

static string? GetUserId(HttpContext context)
    => context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? context.User.FindFirstValue("sub");

// Mẫu route của endpoint, không phải đường dẫn thật: "rooms/{roomId}/rental-requests" phải đếm chung
// mọi phòng, không phải mỗi phòng một bộ đếm.
static string GetRouteTemplate(HttpContext context)
    => (context.GetEndpoint() as RouteEndpoint)?.RoutePattern.RawText
       ?? context.Request.Path.Value?.ToLowerInvariant()
       ?? string.Empty;
