using System.Globalization;
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

           // Chỉ đếm những lần đăng nhập SAI, đúng theo docs/security-design.md mục 6.
           options.Lockout.AllowedForNewUsers = true;
           options.Lockout.MaxFailedAccessAttempts = 5;
           options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
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
// Ngưỡng theo docs/security-design.md mục 6.
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

        // Không tiết lộ tài khoản có tồn tại hay không.
        await context.HttpContext.Response.WriteAsJsonAsync(
            new { title = "Quá nhiều yêu cầu. Vui lòng thử lại sau." },
            cancellationToken);
    };

    // Đây là lớp chặn theo địa chỉ IP. Lớp thứ hai là khóa tạm theo tài khoản của
    // Identity (5 lần sai trong 15 phút) và chỉ đếm những lần đăng nhập SAI — xem AuthService.
    options.AddPolicy(RateLimitPolicies.AuthLogin, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: GetClientIp(context),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(15)
            }));

    options.AddPolicy(RateLimitPolicies.AuthAccount, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: GetClientIp(context),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromHours(1)
            }));

    options.AddPolicy(RateLimitPolicies.BusinessWrite, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.User.Identity?.IsAuthenticated == true
                ? context.User.Identity.Name ?? GetClientIp(context)
                : GetClientIp(context),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromHours(1)
            }));

    options.AddPolicy(RateLimitPolicies.PublicSearch, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: GetClientIp(context),
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(1)
            }));
});

// ------------------------------------------------- Service nghiệp vụ
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<AuditLogger>();
builder.Services.AddScoped<Notifier>();
builder.Services.AddScoped<LandlordApplicationService>();
builder.Services.AddScoped<UserAdminService>();

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

// ------------------------------------------------------------ Pipeline
app.UseSerilogRequestLogging();
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

static string GetClientIp(HttpContext context)
    => context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
