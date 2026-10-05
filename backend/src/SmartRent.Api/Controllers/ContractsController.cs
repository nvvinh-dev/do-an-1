using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Api.Contracts;
using SmartRent.Api.Services;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Controllers;

/// <summary>
/// Hợp đồng — BP-06. Controller chỉ kiểm tra vai trò; quyền sở hữu hợp đồng (Chủ trọ sở hữu phòng,
/// người thuê đứng tên) do ContractService kiểm tra. Admin không có endpoint nào ở đây (BR-24).
/// </summary>
[ApiController]
[Route("api/v1")]
[Authorize]
public class ContractsController : ControllerBase
{
    private readonly ContractService _service;

    public ContractsController(ContractService service)
    {
        _service = service;
    }

    [HttpPost("contracts")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> Create(CreateContractRequest request, CancellationToken cancellationToken)
    {
        var result = await _service.CreateAsync(this.CurrentUserId(), request, cancellationToken);

        return result.Succeeded
            ? Created($"/api/v1/contracts/{result.Value!.Id}", result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    /// <summary>Người thuê thấy hợp đồng mình đứng tên; Chủ trọ thấy hợp đồng của phòng mình.</summary>
    [HttpGet("contracts")]
    [Authorize(Roles = $"{AppRoles.Tenant},{AppRoles.Landlord}")]
    public async Task<IActionResult> List(
        [FromQuery] ContractStatus? status,
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

    [HttpGet("contracts/{id:long}")]
    [Authorize(Roles = $"{AppRoles.Tenant},{AppRoles.Landlord}")]
    public async Task<IActionResult> Detail(long id, CancellationToken cancellationToken)
    {
        var result = await _service.GetDetailAsync(this.CurrentUserId(), id, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    [HttpPut("contracts/{id:long}")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> Update(
        long id,
        UpdateContractRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.UpdateAsync(this.CurrentUserId(), id, request, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    [HttpPost("contracts/{id:long}/send")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> Send(long id, CancellationToken cancellationToken)
        => ToResponse(await _service.SendAsync(this.CurrentUserId(), id, cancellationToken));

    [HttpPost("contracts/{id:long}/recall")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> Recall(long id, CancellationToken cancellationToken)
        => ToResponse(await _service.RecallAsync(this.CurrentUserId(), id, cancellationToken));

    [HttpPost("contracts/{id:long}/confirm")]
    [Authorize(Roles = AppRoles.Tenant)]
    public async Task<IActionResult> Confirm(long id, CancellationToken cancellationToken)
        => ToResponse(await _service.ConfirmAsync(this.CurrentUserId(), id, cancellationToken));

    [HttpPost("contracts/{id:long}/request-changes")]
    [Authorize(Roles = AppRoles.Tenant)]
    public async Task<IActionResult> RequestChanges(
        long id,
        RequestContractChangesRequest request,
        CancellationToken cancellationToken)
        => ToResponse(await _service.RequestChangesAsync(this.CurrentUserId(), id, request.Reason, cancellationToken));

    [HttpPost("contracts/{id:long}/deposit/confirm")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> ConfirmDeposit(
        long id,
        ConfirmDepositRequest request,
        CancellationToken cancellationToken)
        => ToResponse(await _service.ConfirmDepositAsync(this.CurrentUserId(), id, request, cancellationToken));

    /// <summary>Hủy trước ngày bắt đầu — Chủ trọ sở hữu hoặc người thuê đứng tên.</summary>
    [HttpPost("contracts/{id:long}/cancel")]
    [Authorize(Roles = $"{AppRoles.Tenant},{AppRoles.Landlord}")]
    public async Task<IActionResult> Cancel(
        long id,
        CancelContractRequest request,
        CancellationToken cancellationToken)
        => ToResponse(await _service.CancelAsync(this.CurrentUserId(), id, request.Reason, cancellationToken));

    [HttpPost("contracts/{id:long}/deposit/refund")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> RefundDeposit(
        long id,
        RefundDepositRequest request,
        CancellationToken cancellationToken)
        => ToResponse(await _service.RefundDepositAsync(this.CurrentUserId(), id, request, cancellationToken));

    /// <summary>Chỉ số cuối đã ghi nhận của phòng, dùng điền sẵn chỉ số đầu khi lập hợp đồng.</summary>
    [HttpGet("rooms/{roomId:long}/meter-readings/latest")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> LatestMeterReadings(long roomId, CancellationToken cancellationToken)
    {
        var result = await _service.GetLatestMeterReadingsAsync(this.CurrentUserId(), roomId, cancellationToken);

        if (!result.Succeeded)
        {
            return Problem(detail: result.Error, statusCode: result.StatusCode);
        }

        // Phòng chưa từng có hợp đồng thì trả JSON null với mã 200, không phải 204.
        return new JsonResult(result.Value);
    }

    [HttpPatch("contracts/{id:long}/initial-meter-readings")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> UpdateInitialMeterReadings(
        long id,
        InitialMeterReadingsRequest request,
        CancellationToken cancellationToken)
        => ToResponse(await _service.UpdateInitialMeterReadingsAsync(this.CurrentUserId(), id, request, cancellationToken));

    /// <summary>Thao tác đổi trạng thái trả 204 khi thành công.</summary>
    private IActionResult ToResponse(ServiceResult result)
        => result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
}
