using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartRent.Api.Contracts;
using SmartRent.Api.Services;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Controllers;

/// <summary>Hồ sơ đăng ký Chủ trọ ở góc nhìn người nộp.</summary>
[ApiController]
[Route("api/v1/landlord-applications")]
[Authorize]
public class LandlordApplicationsController : ControllerBase
{
    private readonly LandlordApplicationService _service;

    public LandlordApplicationsController(LandlordApplicationService service)
    {
        _service = service;
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Tenant)]
    [EnableRateLimiting(RateLimitPolicies.BusinessWrite)]
    public async Task<IActionResult> Submit(
        SubmitLandlordApplicationRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.SubmitAsync(this.CurrentUserId(), request, cancellationToken);

        return result.Succeeded
            ? Created(string.Empty, result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    [HttpGet("me")]
    public async Task<IActionResult> Mine(CancellationToken cancellationToken)
    {
        var result = await _service.GetMineAsync(this.CurrentUserId(), cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }
}

/// <summary>Duyệt hồ sơ Chủ trọ — chỉ Admin.</summary>
[ApiController]
[Route("api/v1/admin/landlord-applications")]
[Authorize(Roles = AppRoles.Admin)]
public class AdminLandlordApplicationsController : ControllerBase
{
    private readonly LandlordApplicationService _service;

    public AdminLandlordApplicationsController(LandlordApplicationService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] LandlordApplicationStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.ListAsync(status, Math.Max(page, 1), Math.Clamp(pageSize, 1, 100), cancellationToken);
        return Ok(result);
    }

    /// <summary>Nơi duy nhất trả về số CCCD và ảnh giấy tờ, dưới dạng URL có hạn 15 phút.</summary>
    [HttpGet("{id:long}")]
    public async Task<IActionResult> Detail(long id, CancellationToken cancellationToken)
    {
        var result = await _service.GetDetailAsync(id, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    [HttpPost("{id:long}/approve")]
    public async Task<IActionResult> Approve(long id, CancellationToken cancellationToken)
    {
        var result = await _service.ApproveAsync(this.CurrentUserId(), id, cancellationToken);

        return result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    [HttpPost("{id:long}/reject")]
    public async Task<IActionResult> Reject(
        long id,
        RejectLandlordApplicationRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.RejectAsync(this.CurrentUserId(), id, request.Reason, cancellationToken);

        return result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }
}
