using System.Globalization;
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
    private readonly LoginAttemptLimiter _loginLimiter;

    public AuthController(AuthService authService, LoginAttemptLimiter loginLimiter)
    {
        _authService = authService;
        _loginLimiter = loginLimiter;
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
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        // Giữ chỗ một lượt TRƯỚC khi kiểm tra mật khẩu, để request gửi song song không vượt được ngưỡng.
        if (!_loginLimiter.TryReserveAttempt(request.Email, ip, out var retryAfter))
        {
            Response.Headers.RetryAfter =
                ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString(CultureInfo.InvariantCulture);

            return Problem(
                detail: "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau.",
                statusCode: StatusCodes.Status429TooManyRequests);
        }

        var result = await _authService.LoginAsync(request);

        // Lượt đã giữ chỗ chỉ được tính là lần sai khi sai email hoặc mật khẩu.
        if (result.StatusCode != StatusCodes.Status401Unauthorized)
        {
            _loginLimiter.Reset(request.Email, ip);
        }

        return result.Succeeded ? Ok(result.Value) : Problem(result);
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.AuthAccount)]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        await _authService.ForgotPasswordAsync(request);

        // Luôn trả về cùng một kết quả để không tiết lộ email có tồn tại hay không.
        return Ok(new { message = "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi." });
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
