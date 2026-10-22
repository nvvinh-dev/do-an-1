using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    private readonly InvoiceService _service;

    public InvoicesController(InvoiceService service)
    {
        _service = service;
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
}
