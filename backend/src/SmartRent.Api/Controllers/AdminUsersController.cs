using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Api.Contracts;
using SmartRent.Api.Services;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Controllers;

/// <summary>Quản lý tài khoản người dùng — FR-09, chỉ Admin.</summary>
[ApiController]
[Route("api/v1/admin/users")]
[Authorize(Roles = AppRoles.Admin)]
public class AdminUsersController : ControllerBase
{
    private readonly UserAdminService _service;

    public AdminUsersController(UserAdminService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? role,
        [FromQuery] bool? isLocked,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.ListAsync(
            role, isLocked, Math.Max(page, 1), Math.Clamp(pageSize, 1, 100), cancellationToken);

        return Ok(result);
    }

    [HttpPost("{id:long}/lock")]
    public async Task<IActionResult> Lock(long id, LockUserRequest request, CancellationToken cancellationToken)
    {
        var result = await _service.LockAsync(this.CurrentUserId(), id, request.Reason, cancellationToken);

        return result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    [HttpPost("{id:long}/unlock")]
    public async Task<IActionResult> Unlock(long id, CancellationToken cancellationToken)
    {
        var result = await _service.UnlockAsync(this.CurrentUserId(), id, cancellationToken);

        return result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }
}
