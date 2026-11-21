using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Api.Services;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Controllers;

/// <summary>
/// Kết nối ở ghép đã chấp nhận — BP-11, FR-117, api-design mục 15. Chỗ duy nhất trả họ tên và số điện thoại của
/// bên kia (BR-25, QR-07).
/// </summary>
[ApiController]
[Route("api/v1/roommate-connections")]
[Authorize(Roles = AppRoles.Tenant)]
public class RoommateConnectionsController : ControllerBase
{
    private readonly RoommateConnectionService _service;

    public RoommateConnectionsController(RoommateConnectionService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
        => Ok(await _service.ListConnectionsAsync(this.CurrentUserId(), cancellationToken));
}
