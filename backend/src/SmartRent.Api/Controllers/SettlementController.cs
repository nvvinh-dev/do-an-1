using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Api.Contracts;
using SmartRent.Api.Services;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Controllers;

/// <summary>
/// Chấm dứt hợp đồng — BP-10. Controller chỉ kiểm tra vai trò; quyền với hợp đồng (Chủ trọ sở hữu phòng,
/// người thuê đứng tên, bên đã gửi thông báo trả phòng) do SettlementService kiểm tra.
/// </summary>
[ApiController]
[Route("api/v1")]
[Authorize(Roles = $"{AppRoles.Tenant},{AppRoles.Landlord}")]
public class SettlementController : ControllerBase
{
    private readonly SettlementService _service;

    public SettlementController(SettlementService service)
    {
        _service = service;
    }

    /// <summary>Trả 200 kèm số ngày báo trước và việc có được tính phí phạt hay không.</summary>
    [HttpPost("contracts/{id:long}/move-out-notice")]
    public async Task<IActionResult> SendMoveOutNotice(
        long id,
        SendMoveOutNoticeRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.SendMoveOutNoticeAsync(this.CurrentUserId(), id, request, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    [HttpPost("contracts/{id:long}/move-out-notice/withdraw")]
    public async Task<IActionResult> WithdrawMoveOutNotice(long id, CancellationToken cancellationToken)
    {
        var result = await _service.WithdrawMoveOutNoticeAsync(this.CurrentUserId(), id, cancellationToken);

        return result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    /// <summary>Lập hóa đơn thanh lý ở Nháp; trả 201 kèm chi tiết hóa đơn theo cấu trúc GET /invoices/{id}.</summary>
    [HttpPost("contracts/{id:long}/settlement-invoice")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> CreateSettlementInvoice(
        long id,
        SettlementInvoiceRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreateSettlementInvoiceAsync(this.CurrentUserId(), id, request, cancellationToken);

        return result.Succeeded
            ? Created($"/api/v1/invoices/{result.Value!.Id}", result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    /// <summary>Sửa hóa đơn thanh lý còn ở Nháp; trả 200 kèm chi tiết hóa đơn đã tính lại.</summary>
    [HttpPut("contracts/{id:long}/settlement-invoice")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> UpdateSettlementInvoice(
        long id,
        SettlementInvoiceRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.UpdateSettlementInvoiceAsync(this.CurrentUserId(), id, request, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }
}
