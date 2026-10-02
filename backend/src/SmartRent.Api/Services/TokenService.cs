using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Services;

/// <summary>
/// Sinh access token. Token sống 60 phút và hệ thống không dùng refresh token —
/// hết hạn thì người dùng đăng nhập lại.
/// </summary>
public class TokenService
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(60);

    private readonly IConfiguration _configuration;

    public TokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public (string Token, DateTimeOffset ExpiresAt) Create(AppUser user, IEnumerable<string> roles)
    {
        var key = _configuration["Jwt:Key"]!;
        var expiresAt = DateTimeOffset.UtcNow.Add(Lifetime);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
