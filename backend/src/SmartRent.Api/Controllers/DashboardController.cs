using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Api.Services;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Controllers;

/// <summary>Dashboard theo vai trò — api-design mục 12. Số liệu luôn là của người gọi, xác định từ token.</summary>
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

    [HttpGet("landlord")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> Landlord(CancellationToken cancellationToken)
        => Ok(await _service.GetLandlordAsync(this.CurrentUserId(), cancellationToken));
}
