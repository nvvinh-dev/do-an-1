using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace SmartRent.Api.Controllers;

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
