using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartRent.Api.Contracts;
using SmartRent.Api.Services;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Controllers;

/// <summary>
/// Hóa đơn và thanh toán — BP-07. Controller chỉ kiểm tra vai trò; quyền với hợp đồng và hóa đơn (Chủ trọ sở hữu phòng,
/// người thuê đứng tên) do InvoiceService kiểm tra. Admin không có endpoint nào ở đây (BR-24).
/// </summary>
[ApiController]
[Route("api/v1")]
[Authorize]
public class InvoicesController : ControllerBase
{
    /// <summary>Trần của page để (page - 1) * pageSize không tràn số int.</summary>
    private const int MaxPage = 1_000_000;

    private readonly InvoiceService _service;

    public InvoicesController(InvoiceService service)
    {
        _service = service;
    }

    /// <summary>
    /// Chốt chỉ số và lập hóa đơn định kỳ ở Nháp cho kỳ kế tiếp; trả 201 kèm chi tiết hóa đơn theo cấu trúc
    /// GET /invoices/{id}.
    /// </summary>
    [HttpPost("contracts/{contractId:long}/invoices")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> CreatePeriodicInvoice(
        long contractId,
        PeriodicInvoiceRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.CreatePeriodicInvoiceAsync(
            this.CurrentUserId(), contractId, request, cancellationToken);

        return result.Succeeded
            ? Created($"/api/v1/invoices/{result.Value!.Id}", result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    /// <summary>Hóa đơn của một hợp đồng, kỳ mới trước, không phân trang — người thuê đứng tên hoặc Chủ trọ sở hữu.</summary>
    [HttpGet("contracts/{contractId:long}/invoices")]
    [Authorize(Roles = $"{AppRoles.Tenant},{AppRoles.Landlord}")]
    public async Task<IActionResult> ListByContract(long contractId, CancellationToken cancellationToken)
    {
        var result = await _service.ListByContractAsync(this.CurrentUserId(), contractId, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    /// <summary>Chỉ số cũ của kỳ kế tiếp, để màn chốt số hiện cho Chủ trọ.</summary>
    [HttpGet("contracts/{contractId:long}/meter-readings/latest")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> LatestMeterReadings(long contractId, CancellationToken cancellationToken)
    {
        var result = await _service.GetLatestMeterReadingsAsync(this.CurrentUserId(), contractId, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    /// <summary>
    /// Chủ trọ thấy hóa đơn trên khu trọ của mình, Người thuê thấy hóa đơn đã phát hành của hợp đồng mình đứng tên. Lọc
    /// theo status (lặp lại được), month (YYYY-MM, sai dạng trả 400), propertyId và roomId (chỉ Chủ trọ), type.
    /// </summary>
    [HttpGet("invoices")]
    [Authorize(Roles = $"{AppRoles.Tenant},{AppRoles.Landlord}")]
    public async Task<IActionResult> List(
        [FromQuery] InvoiceListFilter filter,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.ListAsync(
            this.CurrentUserId(),
            User.IsInRole(AppRoles.Landlord),
            filter,
            Math.Clamp(page, 1, MaxPage),
            Math.Clamp(pageSize, 1, 100),
            cancellationToken);

        return Ok(result);
    }

    /// <summary>Chi tiết hóa đơn, gồm chỉ số, đơn giá, cách tính và mã VietQR cho người thuê khi còn phải trả.</summary>
    [HttpGet("invoices/{id:long}")]
    [Authorize(Roles = $"{AppRoles.Tenant},{AppRoles.Landlord}")]
    public async Task<IActionResult> Detail(long id, CancellationToken cancellationToken)
    {
        var result = await _service.GetDetailAsync(this.CurrentUserId(), id, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    /// <summary>Sửa hóa đơn định kỳ mới nhất chưa thu đồng nào; body giống lúc lập, trả 200 kèm chi tiết.</summary>
    [HttpPut("invoices/{id:long}")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> Update(
        long id,
        PeriodicInvoiceRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.UpdatePeriodicInvoiceAsync(this.CurrentUserId(), id, request, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    [HttpPost("invoices/{id:long}/issue")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> Issue(long id, CancellationToken cancellationToken)
        => ToResponse(await _service.IssueAsync(this.CurrentUserId(), id, cancellationToken));

    /// <summary>Hủy hóa đơn định kỳ mới nhất chưa thu đồng nào, lý do bắt buộc.</summary>
    [HttpPost("invoices/{id:long}/cancel")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> Cancel(
        long id,
        CancelInvoiceRequest request,
        CancellationToken cancellationToken)
        => ToResponse(await _service.CancelAsync(this.CurrentUserId(), id, request.Reason, cancellationToken));

    /// <summary>
    /// Người thuê đứng tên báo đã thanh toán kèm minh chứng; trả 201 kèm lượt báo, Location trỏ về chi tiết hóa đơn chứa
    /// lượt báo đó.
    /// </summary>
    [HttpPost("invoices/{id:long}/payment-reports")]
    [Authorize(Roles = AppRoles.Tenant)]
    [EnableRateLimiting(RateLimitPolicies.BusinessWrite)]
    public async Task<IActionResult> ReportPayment(
        long id,
        ReportPaymentRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.ReportPaymentAsync(this.CurrentUserId(), id, request, cancellationToken);

        return result.Succeeded
            ? Created($"/api/v1/invoices/{id}", result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    /// <summary>Chỉ Chủ trọ sở hữu xác nhận số tiền thực thu; mọi vai trò khác, kể cả Admin, nhận 403 (BR-06b).</summary>
    [HttpPost("invoices/{id:long}/payment-reports/{reportId:long}/confirm")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> ConfirmPayment(
        long id,
        long reportId,
        ConfirmPaymentRequest request,
        CancellationToken cancellationToken)
        => ToResponse(await _service.ConfirmPaymentAsync(
            this.CurrentUserId(), id, reportId, request.ConfirmedAmount!.Value, cancellationToken));

    /// <summary>Chủ trọ sở hữu từ chối xác nhận thanh toán, lý do bắt buộc.</summary>
    [HttpPost("invoices/{id:long}/payment-reports/{reportId:long}/reject")]
    [Authorize(Roles = AppRoles.Landlord)]
    public async Task<IActionResult> RejectPayment(
        long id,
        long reportId,
        RejectPaymentRequest request,
        CancellationToken cancellationToken)
        => ToResponse(await _service.RejectPaymentAsync(
            this.CurrentUserId(), id, reportId, request.Reason, cancellationToken));

    /// <summary>Thao tác đổi trạng thái trả 204 khi thành công.</summary>
    private IActionResult ToResponse(ServiceResult result)
        => result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
}
