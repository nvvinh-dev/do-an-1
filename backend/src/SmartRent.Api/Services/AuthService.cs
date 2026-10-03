using System.Net;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SmartRent.Api.Contracts;
using SmartRent.Infrastructure.Email;
using SmartRent.Infrastructure.Identity;
using SmartRent.Infrastructure.Persistence;

namespace SmartRent.Api.Services;

/// <summary>Đăng ký, đăng nhập và các thao tác về mật khẩu — BP-01.</summary>
public class AuthService
{
    private readonly AppDbContext _db;
    private readonly UserManager<AppUser> _userManager;
    private readonly TokenService _tokenService;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        AppDbContext db,
        UserManager<AppUser> userManager,
        TokenService tokenService,
        IEmailSender emailSender,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _db = db;
        _userManager = userManager;
        _tokenService = tokenService;
        _emailSender = emailSender;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// FR-01, FR-02: tài khoản mới luôn nhận vai trò Tenant. Tạo tài khoản và gán vai trò
    /// trong cùng một transaction — không bao giờ để lại tài khoản không có vai trò.
    /// </summary>
    public async Task<ServiceResult<CurrentUserResponse>> RegisterAsync(RegisterRequest request)
    {
        if (await _userManager.FindByEmailAsync(request.Email) is not null)
        {
            return ServiceResult<CurrentUserResponse>.Fail(
                StatusCodes.Status409Conflict, "Email này đã được sử dụng.");
        }

        var user = new AppUser
        {
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName,
            PhoneNumber = request.PhoneNumber,
            IsLocked = false,
            RegisteredAt = DateTimeOffset.UtcNow
        };

        await using var transaction = await _db.Database.BeginTransactionAsync();

        IdentityResult created;

        try
        {
            created = await _userManager.CreateAsync(user, request.Password);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Hai lượt đăng ký cùng email gửi gần như cùng lúc đều qua được bước kiểm tra ở trên;
            // unique index trên tên đăng nhập (chính là email) chặn lượt thứ hai.
            return ServiceResult<CurrentUserResponse>.Fail(
                StatusCodes.Status409Conflict, "Email này đã được sử dụng.");
        }

        if (!created.Succeeded)
        {
            return ServiceResult<CurrentUserResponse>.Fail(
                StatusCodes.Status400BadRequest, Describe(created));
        }

        var roleAdded = await _userManager.AddToRoleAsync(user, AppRoles.Tenant);

        if (!roleAdded.Succeeded)
        {
            await transaction.RollbackAsync();

            _logger.LogError("Khong gan duoc vai tro Tenant khi dang ky: {Errors}", Describe(roleAdded));
            return ServiceResult<CurrentUserResponse>.Fail(
                StatusCodes.Status500InternalServerError, "Không tạo được tài khoản. Vui lòng thử lại sau.");
        }

        await transaction.CommitAsync();

        return ServiceResult<CurrentUserResponse>.Ok(
            new CurrentUserResponse(user.Id, user.Email!, user.FullName, user.PhoneNumber, [AppRoles.Tenant]));
    }

    /// <summary>
    /// FR-03, FR-04. Giới hạn đăng nhập sai nằm ở <see cref="LoginAttemptLimiter"/>,
    /// dựa trên mã 401 mà hàm này trả về.
    /// </summary>
    public async Task<ServiceResult<LoginResponse>> LoginAsync(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);

        // Không tiết lộ email có tồn tại trong hệ thống hay không.
        const string invalidCredentials = "Email hoặc mật khẩu không đúng.";

        if (user is null || !await _userManager.CheckPasswordAsync(user, request.Password))
        {
            return ServiceResult<LoginResponse>.Fail(StatusCodes.Status401Unauthorized, invalidCredentials);
        }

        // Kiểm tra khóa SAU khi mật khẩu đúng: chỉ chủ tài khoản mới thấy lý do khóa,
        // người ngoài không dò được email nào đang bị khóa.
        if (user.IsLocked)
        {
            return ServiceResult<LoginResponse>.Fail(
                StatusCodes.Status403Forbidden,
                $"Tài khoản đã bị khóa. Lý do: {user.LockReason ?? "không được ghi nhận"}.");
        }

        var roles = await _userManager.GetRolesAsync(user);
        var (token, expiresAt) = _tokenService.Create(user, roles);

        return ServiceResult<LoginResponse>.Ok(new LoginResponse(
            token,
            expiresAt,
            new CurrentUserResponse(user.Id, user.Email!, user.FullName, user.PhoneNumber, [.. roles])));
    }

    public async Task<ServiceResult<CurrentUserResponse>> GetCurrentAsync(long userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
        {
            return ServiceResult<CurrentUserResponse>.Fail(StatusCodes.Status404NotFound, "Không tìm thấy tài khoản.");
        }

        var roles = await _userManager.GetRolesAsync(user);

        return ServiceResult<CurrentUserResponse>.Ok(
            new CurrentUserResponse(user.Id, user.Email!, user.FullName, user.PhoneNumber, [.. roles]));
    }

    /// <summary>FR-83: cập nhật họ tên và số điện thoại.</summary>
    public async Task<ServiceResult<CurrentUserResponse>> UpdateProfileAsync(long userId, UpdateProfileRequest request)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
        {
            return ServiceResult<CurrentUserResponse>.Fail(StatusCodes.Status404NotFound, "Không tìm thấy tài khoản.");
        }

        user.FullName = request.FullName;

        // BR-01: số điện thoại đã được Admin xác minh; đổi số thì phải xác minh lại.
        if (user.PhoneNumber != request.PhoneNumber)
        {
            user.PhoneNumber = request.PhoneNumber;
            user.PhoneNumberConfirmed = false;
        }

        var updated = await _userManager.UpdateAsync(user);

        if (!updated.Succeeded)
        {
            return ServiceResult<CurrentUserResponse>.Fail(StatusCodes.Status400BadRequest, Describe(updated));
        }

        var roles = await _userManager.GetRolesAsync(user);

        return ServiceResult<CurrentUserResponse>.Ok(
            new CurrentUserResponse(user.Id, user.Email!, user.FullName, user.PhoneNumber, [.. roles]));
    }

    /// <summary>FR-05: đổi mật khẩu khi đang đăng nhập.</summary>
    public async Task<ServiceResult> ChangePasswordAsync(long userId, ChangePasswordRequest request)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy tài khoản.");
        }

        var changed = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);

        return changed.Succeeded
            ? ServiceResult.Ok()
            : ServiceResult.Fail(StatusCodes.Status400BadRequest, Describe(changed));
    }

    /// <summary>
    /// FR-05: gửi liên kết đặt lại mật khẩu qua email.
    /// Luôn trả về thành công và trả về ngay, dù email có tồn tại hay không, để không biến
    /// endpoint này thành công cụ dò tài khoản — kể cả qua thời gian phản hồi.
    /// </summary>
    public async Task<ServiceResult> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);

        if (user is null || user.IsLocked)
        {
            _logger.LogInformation("Yeu cau dat lai mat khau cho email khong hop le hoac tai khoan bi khoa");
            return ServiceResult.Ok();
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var baseUrl = _configuration["Frontend:BaseUrl"]?.TrimEnd('/') ?? "http://localhost:5173";

        // Trang A4 trong docs/frontend-screens.md.
        var link = $"{baseUrl}/reset-password" +
                   $"?email={WebUtility.UrlEncode(user.Email)}" +
                   $"&token={WebUtility.UrlEncode(token)}";

        var body = $"""
            <p>Xin chào {WebUtility.HtmlEncode(user.FullName)},</p>
            <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản SmartRent.</p>
            <p><a href="{link}">Bấm vào đây để đặt mật khẩu mới</a></p>
            <p>Nếu không phải bạn yêu cầu, hãy bỏ qua email này — mật khẩu hiện tại vẫn giữ nguyên.</p>
            """;

        // Gửi nền: SMTP mất vài giây, nếu chờ thì email có thật sẽ phản hồi chậm hơn email
        // không tồn tại, và lỗi SMTP sẽ thành 500. Lỗi gửi chỉ được ghi log.
        var email = user.Email!;

        _ = Task.Run(async () =>
        {
            try
            {
                await _emailSender.SendAsync(email, "Đặt lại mật khẩu SmartRent", body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Khong gui duoc email dat lai mat khau");
            }
        });

        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> ResetPasswordAsync(ResetPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);

        // Thông báo giống nhau cho mọi trường hợp thất bại, không tiết lộ email có tồn tại không.
        const string invalid = "Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.";

        if (user is null)
        {
            return ServiceResult.Fail(StatusCodes.Status400BadRequest, invalid);
        }

        var reset = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);

        return reset.Succeeded
            ? ServiceResult.Ok()
            : ServiceResult.Fail(StatusCodes.Status400BadRequest, invalid);
    }

    private static string Describe(IdentityResult result)
        => string.Join(" ", result.Errors.Select(e => e.Description));
}
