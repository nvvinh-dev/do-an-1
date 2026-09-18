using Microsoft.AspNetCore.Identity;

namespace SmartRent.Infrastructure.Identity;

public class AppRole : IdentityRole<long>
{
}

/// <summary>Ba vai trò của hệ thống.</summary>
public static class AppRoles
{
    public const string Admin = "Admin";
    public const string Landlord = "Landlord";
    public const string Tenant = "Tenant";
}
