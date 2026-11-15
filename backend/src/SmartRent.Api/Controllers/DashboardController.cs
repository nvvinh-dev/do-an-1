using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Api.Services;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Controllers;

/// <summary>
/// Dashboard theo vai trò — api-design mục 12. Số liệu của Chủ trọ và Người thuê là của người gọi, xác định từ token;
/// số liệu của Admin là toàn hệ thống.
/// </summary>
[ApiController]
[Route("api/v1/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly DashboardService _service;

    public DashboardController(DashboardService service)
    {
        _service = service;
    }

    [HttpGet("admin")]
    [Authorize(Roles = AppRoles.Admin)]
    public async Task<IActionResult> Admin(CancellationToken cancellationToken)
        => Ok(await _service.GetAdminAsync(cancellationToken));

    [HttpGet("landlord")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> Landlord(CancellationToken cancellationToken)
        => Ok(await _service.GetLandlordAsync(this.CurrentUserId(), cancellationToken));

    [HttpGet("tenant")]
    [Authorize(Roles = AppRoles.Tenant)]
    public async Task<IActionResult> Tenant(CancellationToken cancellationToken)
        => Ok(await _service.GetTenantAsync(this.CurrentUserId(), cancellationToken));
}
