using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartRent.Api.Contracts;
using SmartRent.Api.Services;
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
