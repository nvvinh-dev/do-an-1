using System.Net;
using Microsoft.AspNetCore.Identity;
using SmartRent.Api.Contracts;
using SmartRent.Infrastructure.Email;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Services;

/// <summary>Đăng ký, đăng nhập và các thao tác về mật khẩu — BP-01.</summary>
public class AuthService
{
    private readonly UserManager<AppUser> _userManager;
    private readonly TokenService _tokenService;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        UserManager<AppUser> userManager,
        TokenService tokenService,
        IEmailSender emailSender,
        IConfiguration configuration,
        ILogger<AuthService> logger)
    {
        _userManager = userManager;
        _tokenService = tokenService;
        _emailSender = emailSender;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>FR-01, FR-02: tài khoản mới luôn nhận vai trò Tenant.</summary>
    public async Task<ServiceResult<CurrentUserResponse>> RegisterAsync(RegisterRequest request)
    {
        if (await _userManager.FindByEmailAsync(request.Email) is not null)
        {
            return ServiceResult<CurrentUserResponse>.Fail(
                StatusCodes.Status409Conflict, "Email nay da duoc su dung.");
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

        var created = await _userManager.CreateAsync(user, request.Password);

        if (!created.Succeeded)
        {
            return ServiceResult<CurrentUserResponse>.Fail(
                StatusCodes.Status400BadRequest, Describe(created));
        }

        await _userManager.AddToRoleAsync(user, AppRoles.Tenant);

        return ServiceResult<CurrentUserResponse>.Ok(
            new CurrentUserResponse(user.Id, user.Email!, user.FullName, user.PhoneNumber, [AppRoles.Tenant]));
    }

    /// <summary>
    /// FR-03, FR-04. Chỉ những lần đăng nhập SAI mới bị tính vào ngưỡng khóa tạm,
    /// nên người dùng thật đăng nhập đúng không bao giờ bị chặn nhầm.
    /// </summary>
    public async Task<ServiceResult<LoginResponse>> LoginAsync(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);

        // Không tiết lộ email có tồn tại trong hệ thống hay không.
        const string invalidCredentials = "Email hoac mat khau khong dung.";

        if (user is null)
        {
            return ServiceResult<LoginResponse>.Fail(StatusCodes.Status401Unauthorized, invalidCredentials);
        }

        if (user.IsLocked)
        {
            return ServiceResult<LoginResponse>.Fail(
                StatusCodes.Status403Forbidden,
                $"Tai khoan da bi khoa. Ly do: {user.LockReason ?? "khong duoc ghi nhan"}.");
        }

        if (await _userManager.IsLockedOutAsync(user))
        {
            return ServiceResult<LoginResponse>.Fail(
                StatusCodes.Status429TooManyRequests,
                "Ban da nhap sai qua nhieu lan. Vui long thu lai sau 15 phut.");
        }

        if (!await _userManager.CheckPasswordAsync(user, request.Password))
        {
            await _userManager.AccessFailedAsync(user);
            return ServiceResult<LoginResponse>.Fail(StatusCodes.Status401Unauthorized, invalidCredentials);
        }

        await _userManager.ResetAccessFailedCountAsync(user);

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
            return ServiceResult<CurrentUserResponse>.Fail(StatusCodes.Status404NotFound, "Khong tim thay tai khoan.");
        }

        var roles = await _userManager.GetRolesAsync(user);

        return ServiceResult<CurrentUserResponse>.Ok(
            new CurrentUserResponse(user.Id, user.Email!, user.FullName, user.PhoneNumber, [.. roles]));
    }

    public async Task<ServiceResult<CurrentUserResponse>> UpdateProfileAsync(long userId, UpdateProfileRequest request)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user is null)
        {
            return ServiceResult<CurrentUserResponse>.Fail(StatusCodes.Status404NotFound, "Khong tim thay tai khoan.");
        }

        user.FullName = request.FullName;
        user.PhoneNumber = request.PhoneNumber;

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
            return ServiceResult.Fail(StatusCodes.Status404NotFound, "Khong tim thay tai khoan.");
        }

        var changed = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);

        return changed.Succeeded
            ? ServiceResult.Ok()
            : ServiceResult.Fail(StatusCodes.Status400BadRequest, Describe(changed));
    }

    /// <summary>
    /// FR-05: gửi liên kết đặt lại mật khẩu qua email.
    /// Luôn trả về thành công dù email có tồn tại hay không, để không biến endpoint này
    /// thành công cụ dò tài khoản.
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

        var link = $"{baseUrl}/dat-lai-mat-khau" +
                   $"?email={WebUtility.UrlEncode(user.Email)}" +
                   $"&token={WebUtility.UrlEncode(token)}";

        var body = $"""
            <p>Xin chào {WebUtility.HtmlEncode(user.FullName)},</p>
            <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản SmartRent.</p>
            <p><a href="{link}">Bấm vào đây để đặt mật khẩu mới</a></p>
            <p>Nếu không phải bạn yêu cầu, hãy bỏ qua email này — mật khẩu hiện tại vẫn giữ nguyên.</p>
            """;

        await _emailSender.SendAsync(user.Email!, "Dat lai mat khau SmartRent", body);

        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> ResetPasswordAsync(ResetPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);

        // Thông báo giống nhau cho mọi trường hợp thất bại, không tiết lộ email có tồn tại không.
        const string invalid = "Yeu cau dat lai mat khau khong hop le hoac da het han.";

        if (user is null)
        {
            return ServiceResult.Fail(StatusCodes.Status400BadRequest, invalid);
        }

        var reset = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);

        if (!reset.Succeeded)
        {
            return ServiceResult.Fail(StatusCodes.Status400BadRequest, invalid);
        }

        // Đặt lại mật khẩu thành công thì gỡ luôn trạng thái khóa tạm do nhập sai nhiều lần.
        await _userManager.ResetAccessFailedCountAsync(user);
        await _userManager.SetLockoutEndDateAsync(user, null);

        return ServiceResult.Ok();
    }

    private static string Describe(IdentityResult result)
        => string.Join(" ", result.Errors.Select(e => e.Description));
}
