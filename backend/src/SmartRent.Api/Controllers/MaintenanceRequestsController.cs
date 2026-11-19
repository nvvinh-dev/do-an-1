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

    // Chuyển trạng thái: sai trạng thái nguồn trả 409 (BR-05b), thành công trả 204.

    /// <summary>Tiếp nhận: Mới → Đang xử lý.</summary>
    [HttpPost("{id:long}/accept")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> Accept(
        long id,
        MaintenanceExpectedCompletionDateRequest request,
        CancellationToken cancellationToken)
        => ToResponse(await _service.AcceptAsync(
            this.CurrentUserId(), id, request.ExpectedCompletionDate, cancellationToken));

    /// <summary>Sửa ngày dự kiến sửa xong khi Đang xử lý.</summary>
    [HttpPatch("{id:long}/expected-completion-date")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> ChangeExpectedCompletionDate(
        long id,
        MaintenanceExpectedCompletionDateRequest request,
        CancellationToken cancellationToken)
        => ToResponse(await _service.ChangeExpectedCompletionDateAsync(
            this.CurrentUserId(), id, request.ExpectedCompletionDate, cancellationToken));

    /// <summary>Từ chối: Mới / Đang xử lý → Từ chối.</summary>
    [HttpPost("{id:long}/reject")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> Reject(
        long id,
        RejectMaintenanceRequestRequest request,
        CancellationToken cancellationToken)
        => ToResponse(await _service.RejectAsync(this.CurrentUserId(), id, request, cancellationToken));

    /// <summary>Báo đã sửa xong: Đang xử lý → Chờ người thuê xác nhận.</summary>
    [HttpPost("{id:long}/complete")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> Complete(long id, CancellationToken cancellationToken)
        => ToResponse(await _service.CompleteAsync(this.CurrentUserId(), id, cancellationToken));

    /// <summary>Xác nhận đã khắc phục: Chờ người thuê xác nhận → Đã đóng.</summary>
    [HttpPost("{id:long}/confirm")]
    [Authorize(Roles = AppRoles.Tenant)]
    public async Task<IActionResult> Confirm(long id, CancellationToken cancellationToken)
        => ToResponse(await _service.ConfirmAsync(this.CurrentUserId(), id, cancellationToken));

    /// <summary>Báo chưa đạt: Chờ người thuê xác nhận → Đang xử lý.</summary>
    [HttpPost("{id:long}/not-fixed")]
    [Authorize(Roles = AppRoles.Tenant)]
    public async Task<IActionResult> NotFixed(
        long id,
        MaintenanceNotFixedRequest request,
        CancellationToken cancellationToken)
        => ToResponse(await _service.MarkNotFixedAsync(this.CurrentUserId(), id, request.Reason, cancellationToken));

    /// <summary>Hủy: Mới / Đang xử lý → Đã hủy.</summary>
    [HttpPost("{id:long}/cancel")]
    [Authorize(Roles = AppRoles.Tenant)]
    public async Task<IActionResult> Cancel(long id, CancellationToken cancellationToken)
        => ToResponse(await _service.CancelAsync(this.CurrentUserId(), id, cancellationToken));

    private IActionResult ToResponse(ServiceResult result)
        => result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
}
