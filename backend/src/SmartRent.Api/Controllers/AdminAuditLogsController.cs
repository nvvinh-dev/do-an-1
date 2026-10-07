using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Api.Contracts;
using SmartRent.Api.Services;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Controllers;

/// <summary>
/// Tra cứu nhật ký hệ thống — FR-64, chỉ Admin. Chỉ có thao tác đọc: không có endpoint tạo, sửa hay xóa
/// nhật ký, kể cả cho Admin (FR-63, QR-03).
/// </summary>
[ApiController]
[Route("api/v1/admin/audit-logs")]
[Authorize(Roles = AppRoles.Admin)]
public class AdminAuditLogsController : ControllerBase
{
    private readonly AuditLogService _service;

    public AdminAuditLogsController(AuditLogService service)
    {
        _service = service;
    }

    /// <summary>Lọc theo entityType, entityId, actorUserId, action, from, to; khoảng thời gian ngược trả 400.</summary>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] AuditLogFilter filter,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.ListAsync(
            filter, Math.Max(page, 1), Math.Clamp(pageSize, 1, 100), cancellationToken);

        return Ok(result);
    }
}
