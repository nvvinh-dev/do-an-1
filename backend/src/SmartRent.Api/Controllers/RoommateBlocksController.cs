using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Api.Services;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Controllers;

/// <summary>
/// Danh sách chặn trong ở ghép của chính người gọi — BP-11, FR-118, api-design mục 15. Chặn nằm ở
/// <c>POST /roommate-profiles/{id}/block</c>.
/// </summary>
[ApiController]
[Route("api/v1/roommate-blocks")]
[Authorize(Roles = AppRoles.Tenant)]
public class RoommateBlocksController : ControllerBase
{
    private readonly RoommateConnectionService _service;

    public RoommateBlocksController(RoommateConnectionService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
        => Ok(await _service.ListBlocksAsync(this.CurrentUserId(), cancellationToken));

    /// <summary>Bỏ chặn; lượt chặn không phải của người gọi trả 404.</summary>
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Unblock(long id, CancellationToken cancellationToken)
    {
        var result = await _service.UnblockAsync(this.CurrentUserId(), id, cancellationToken);

        return result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }
}
