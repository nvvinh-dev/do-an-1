using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartRent.Api.Contracts;
using SmartRent.Api.Services;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Controllers;

/// <summary>
/// Hồ sơ ở ghép — BP-11, api-design mục 15. Hồ sơ của chính mình đi qua <c>me</c>, không có id trong đường dẫn; hồ sơ
/// người khác đi qua id và chỉ khi người gọi xem được (FR-114) — RoommateConnectionService kiểm tra.
/// </summary>
[ApiController]
[Route("api/v1/roommate-profiles")]
[Authorize(Roles = AppRoles.Tenant)]
public class RoommateProfilesController : ControllerBase
{
    private const string MyProfileLocation = "/api/v1/roommate-profiles/me";

    private readonly RoommateProfileService _service;
    private readonly RoommateConnectionService _connections;

    public RoommateProfilesController(RoommateProfileService service, RoommateConnectionService connections)
    {
        _service = service;
        _connections = connections;
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

    /// <summary>Tối đa 20 ứng viên kèm điểm phù hợp (FR-113).</summary>
    [HttpGet("matches")]
    public async Task<IActionResult> Matches(CancellationToken cancellationToken)
    {
        var result = await _connections.GetMatchesAsync(this.CurrentUserId(), cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    /// <summary>Phần không định danh của hồ sơ người khác (FR-114).</summary>
    [HttpGet("{id:long}")]
    public async Task<IActionResult> Detail(long id, CancellationToken cancellationToken)
    {
        var result = await _connections.GetProfileAsync(this.CurrentUserId(), id, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    /// <summary>Gửi lời mời kết nối tới chủ hồ sơ (FR-115, FR-116).</summary>
    [HttpPost("{id:long}/invitations")]
    [EnableRateLimiting(RateLimitPolicies.BusinessWrite)]
    public async Task<IActionResult> SendInvitation(long id, CancellationToken cancellationToken)
    {
        var result = await _connections.SendInvitationAsync(this.CurrentUserId(), id, cancellationToken);

        return result.Succeeded
            ? StatusCode(StatusCodes.Status201Created, result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    /// <summary>Chặn chủ hồ sơ (FR-118); đã chặn từ trước thì vẫn 204.</summary>
    [HttpPost("{id:long}/block")]
    public async Task<IActionResult> Block(long id, CancellationToken cancellationToken)
    {
        var result = await _connections.BlockAsync(this.CurrentUserId(), id, cancellationToken);

        return result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }
}
