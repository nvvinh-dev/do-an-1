namespace SmartRent.Api.Contracts;

public record RegisterRequest(string Email, string Password, string FullName, string? PhoneNumber);

public record LoginRequest(string Email, string Password);

public record LoginResponse(string AccessToken, DateTimeOffset ExpiresAt, CurrentUserResponse User);

/// <summary>Thông tin tài khoản trả cho chính chủ. Không chứa trường kỹ thuật của Identity.</summary>
public record CurrentUserResponse(
    long Id,
    string Email,
    string FullName,
    string? PhoneNumber,
    IReadOnlyList<string> Roles);

public record UpdateProfileRequest(string FullName, string? PhoneNumber);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record ForgotPasswordRequest(string Email);

public record ResetPasswordRequest(string Email, string Token, string NewPassword);
