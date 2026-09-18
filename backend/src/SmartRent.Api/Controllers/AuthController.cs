using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartRent.Api.Contracts;
using SmartRent.Api.Services;

namespace SmartRent.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.AuthAccount)]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request);
        return result.Succeeded ? Created(string.Empty, result.Value) : Problem(result);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.AuthLogin)]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.AuthAccount)]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        await _authService.ForgotPasswordAsync(request);

        // Luôn trả về cùng một kết quả để không tiết lộ email có tồn tại hay không.
        return Ok(new { message = "Neu email ton tai trong he thong, huong dan dat lai mat khau da duoc gui." });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.AuthAccount)]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        var result = await _authService.ResetPasswordAsync(request);
        return result.Succeeded ? NoContent() : Problem(result);
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var result = await _authService.ChangePasswordAsync(this.CurrentUserId(), request);
        return result.Succeeded ? NoContent() : Problem(result);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var result = await _authService.GetCurrentAsync(this.CurrentUserId());
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile(UpdateProfileRequest request)
    {
        var result = await _authService.UpdateProfileAsync(this.CurrentUserId(), request);
        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    private IActionResult Problem(ServiceResult result)
        => Problem(detail: result.Error, statusCode: result.StatusCode);
}

/// <summary>Đọc danh tính người gọi từ token — không bao giờ lấy từ body hay query.</summary>
public static class ControllerUserExtensions
{
    public static long CurrentUserId(this ControllerBase controller)
    {
        var value = controller.User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? controller.User.FindFirstValue("sub");

        return long.TryParse(value, out var id)
            ? id
            : throw new InvalidOperationException("Token khong chua danh tinh nguoi dung hop le.");
    }
}
