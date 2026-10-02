using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Api.Contracts;
using SmartRent.Api.Services;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Controllers;

/// <summary>
/// Tài khoản nhận tiền của chính Chủ trọ đang đăng nhập — BR-26.
/// Không có tham số id: Chủ trọ chỉ đọc và sửa được tài khoản của mình.
/// </summary>
[ApiController]
[Route("api/v1/landlord/bank-account")]
[Authorize(Roles = AppRoles.Landlord)]
public class LandlordBankAccountController : ControllerBase
{
    private readonly LandlordBankAccountService _service;

    public LandlordBankAccountController(LandlordBankAccountService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var result = await _service.GetAsync(this.CurrentUserId(), cancellationToken);

        if (!result.Succeeded)
        {
            return Problem(detail: result.Error, statusCode: result.StatusCode);
        }

        // Chưa khai báo thì trả JSON null với mã 200, không phải 204.
        return new JsonResult(result.Value);
    }

    [HttpPut]
    public async Task<IActionResult> Update(BankAccountRequest request, CancellationToken cancellationToken)
    {
        var result = await _service.UpdateAsync(this.CurrentUserId(), request, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }
}
