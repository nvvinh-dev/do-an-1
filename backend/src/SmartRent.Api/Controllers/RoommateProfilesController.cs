using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Api.Contracts;
using SmartRent.Api.Services;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Controllers;

/// <summary>
/// Hồ sơ ở ghép của chính Người thuê đang đăng nhập — BP-11, api-design mục 15. Không có id trong đường dẫn:
/// Người thuê chỉ đọc và sửa được hồ sơ của mình.
/// </summary>
[ApiController]
[Route("api/v1/roommate-profiles")]
[Authorize(Roles = AppRoles.Tenant)]
public class RoommateProfilesController : ControllerBase
{
    private const string MyProfileLocation = "/api/v1/roommate-profiles/me";

    private readonly RoommateProfileService _service;

    public RoommateProfilesController(RoommateProfileService service)
    {
        _service = service;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        var result = await _service.GetMineAsync(this.CurrentUserId(), cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    /// <summary>Chưa có hồ sơ thì tạo (201), đã có thì sửa (200).</summary>
    [HttpPut("me")]
    public async Task<IActionResult> Upsert(RoommateProfileRequest request, CancellationToken cancellationToken)
    {
        var result = await _service.UpsertAsync(this.CurrentUserId(), request, cancellationToken);

        if (!result.Succeeded)
        {
            return Problem(detail: result.Error, statusCode: result.StatusCode);
        }

        return result.Value!.Created
            ? Created(MyProfileLocation, result.Value.Profile)
            : Ok(result.Value.Profile);
    }

    [HttpPatch("me/searching")]
    public async Task<IActionResult> SetSearching(RoommateSearchingRequest request, CancellationToken cancellationToken)
    {
        var result = await _service.SetSearchingAsync(
            this.CurrentUserId(), request.IsSearching!.Value, cancellationToken);

        return result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    [HttpDelete("me")]
    public async Task<IActionResult> DeleteMine(CancellationToken cancellationToken)
    {
        var result = await _service.DeleteMineAsync(this.CurrentUserId(), cancellationToken);

        return result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }
}
