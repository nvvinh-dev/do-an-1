namespace SmartRent.Infrastructure.Identity;

/// <summary>Ba vai trò của hệ thống. Mỗi tài khoản có đúng một vai trò.</summary>
public static class AppRoles
{
    public const string Admin = "Admin";
    public const string Landlord = "Landlord";
    public const string Tenant = "Tenant";
}
