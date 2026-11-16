using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartRent.Api.Contracts;
using SmartRent.Api.Services;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Controllers;

/// <summary>Sự cố — BP-08, api-design mục 18. Quyền sở hữu do MaintenanceRequestService kiểm tra.</summary>
[ApiController]
[Route("api/v1/maintenance-requests")]
[Authorize]
public class MaintenanceRequestsController : ControllerBase
{
    /// <summary>Trần của page để (page - 1) * pageSize không tràn số int.</summary>
    private const int MaxPage = 1_000_000;

    private readonly MaintenanceRequestService _service;

    public MaintenanceRequestsController(MaintenanceRequestService service)
    {
        _service = service;
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Tenant)]
    [EnableRateLimiting(RateLimitPolicies.BusinessWrite)]
    public async Task<IActionResult> Report(ReportMaintenanceRequestRequest request, CancellationToken cancellationToken)
    {
        var result = await _service.ReportAsync(this.CurrentUserId(), request, cancellationToken);

        return result.Succeeded
            ? Created($"/api/v1/maintenance-requests/{result.Value!.Id}", result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    /// <summary>Người thuê thấy sự cố của mình; Chủ trọ thấy sự cố trên khu trọ của mình.</summary>
    /// <param name="sortBy"><c>createdAt</c> (mặc định) hoặc <c>urgency</c>.</param>
    [HttpGet]
    [Authorize(Roles = $"{AppRoles.Tenant},{AppRoles.Landlord}")]
    public async Task<IActionResult> List(
        [FromQuery] MaintenanceRequestStatus? status,
        [FromQuery] long? contractId,
        [FromQuery] long? propertyId,
        [FromQuery] MaintenanceUrgency? urgency,
        [FromQuery] string? sortBy,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        bool sortByUrgency;

        switch (sortBy?.ToLowerInvariant())
        {
            case null or "createdat":
                sortByUrgency = false;
                break;
            case "urgency":
                sortByUrgency = true;
                break;
            default:
                return Problem(
                    detail: "sortBy chỉ nhận createdAt hoặc urgency.",
                    statusCode: StatusCodes.Status400BadRequest);
        }

        var result = await _service.ListAsync(
            this.CurrentUserId(),
            User.IsInRole(AppRoles.Landlord),
            status,
            contractId,
            propertyId,
            urgency,
            sortByUrgency,
            Math.Clamp(page, 1, MaxPage),
            Math.Clamp(pageSize, 1, 100),
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:long}")]
    [Authorize(Roles = $"{AppRoles.Tenant},{AppRoles.Landlord}")]
    public async Task<IActionResult> Detail(long id, CancellationToken cancellationToken)
    {
        var result = await _service.GetDetailAsync(this.CurrentUserId(), id, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }
}
