using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartRent.Api.Contracts;
using SmartRent.Api.Services;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Controllers;

/// <summary>Trợ lý AI tra cứu — BP-12, api-design mục 16. Phạm vi dữ liệu theo vai trò do AssistantService quyết định.</summary>
[ApiController]
[Route("api/v1/assistant")]
[Authorize]
public class AssistantController : ControllerBase
{
    private readonly AssistantService _service;

    public AssistantController(AssistantService service)
    {
        _service = service;
    }

    /// <summary>Hỏi trợ lý. Mỗi câu hỏi độc lập, không lưu (FR-131); AI lỗi thì <c>503</c> (FR-121).</summary>
    [HttpPost("questions")]
    [EnableRateLimiting(RateLimitPolicies.Ai)]
    public async Task<IActionResult> Ask(AskAssistantRequest request, CancellationToken cancellationToken)
    {
        // Vai trò lấy từ token. Admin xét trước: Admin chỉ hỏi cách dùng hệ thống (FR-127, BR-24).
        var role = User.IsInRole(AppRoles.Admin) ? AssistantAskerRole.Admin
            : User.IsInRole(AppRoles.Landlord) ? AssistantAskerRole.Landlord
            : AssistantAskerRole.Tenant;

        var result = await _service.AskAsync(this.CurrentUserId(), role, request.Question, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }
}
