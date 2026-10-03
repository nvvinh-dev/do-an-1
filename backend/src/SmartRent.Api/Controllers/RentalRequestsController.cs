using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartRent.Api.Contracts;
using SmartRent.Api.Services;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Controllers;

/// <summary>Yêu cầu thuê — BP-06. Quyền sở hữu yêu cầu và phòng do RentalRequestService kiểm tra.</summary>
[ApiController]
[Route("api/v1")]
[Authorize]
public class RentalRequestsController : ControllerBase
{
    private readonly RentalRequestService _service;

    public RentalRequestsController(RentalRequestService service)
    {
        _service = service;
    }

    [HttpPost("rooms/{roomId:long}/rental-requests")]
    [Authorize(Roles = AppRoles.Tenant)]
    [EnableRateLimiting(RateLimitPolicies.BusinessWrite)]
    public async Task<IActionResult> Submit(
        long roomId,
        SubmitRentalRequestRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.SubmitAsync(this.CurrentUserId(), roomId, request, cancellationToken);

        return result.Succeeded
            ? Created($"/api/v1/rental-requests/{result.Value!.Id}", result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    /// <summary>Người thuê thấy yêu cầu của mình; Chủ trọ thấy yêu cầu gửi tới phòng của mình.</summary>
    [HttpGet("rental-requests")]
    [Authorize(Roles = $"{AppRoles.Tenant},{AppRoles.Landlord}")]
    public async Task<IActionResult> List(
        [FromQuery] RentalRequestStatus? status,
        [FromQuery] long? roomId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.ListAsync(
            this.CurrentUserId(),
            User.IsInRole(AppRoles.Landlord),
            status,
            roomId,
            Math.Max(page, 1),
            Math.Clamp(pageSize, 1, 100),
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("rental-requests/{id:long}")]
    [Authorize(Roles = $"{AppRoles.Tenant},{AppRoles.Landlord}")]
    public async Task<IActionResult> Detail(long id, CancellationToken cancellationToken)
    {
        var result = await _service.GetDetailAsync(this.CurrentUserId(), id, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    [HttpPost("rental-requests/{id:long}/approve")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> Approve(long id, CancellationToken cancellationToken)
    {
        var result = await _service.ApproveAsync(this.CurrentUserId(), id, cancellationToken);

        return result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    /// <summary>Từ chối yêu cầu đang chờ, hoặc hủy duyệt yêu cầu đã duyệt mà chưa lập hợp đồng.</summary>
    [HttpPost("rental-requests/{id:long}/reject")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> Reject(
        long id,
        RejectRentalRequestRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.RejectAsync(this.CurrentUserId(), id, request.Reason, cancellationToken);

        return result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    [HttpPost("rental-requests/{id:long}/cancel")]
    [Authorize(Roles = AppRoles.Tenant)]
    public async Task<IActionResult> Cancel(long id, CancellationToken cancellationToken)
    {
        var result = await _service.CancelAsync(this.CurrentUserId(), id, cancellationToken);

        return result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }
}
