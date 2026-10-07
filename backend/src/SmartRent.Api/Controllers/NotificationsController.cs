using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Api.Services;

namespace SmartRent.Api.Controllers;

/// <summary>
/// Thông báo trong ứng dụng — mọi vai trò đã đăng nhập. Người nhận luôn lấy từ token, nên mỗi người chỉ thấy
/// và đánh dấu được thông báo của mình. Không có endpoint tạo thông báo.
/// </summary>
[ApiController]
[Route("api/v1/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly NotificationService _service;

    public NotificationsController(NotificationService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] bool? isRead,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.ListAsync(
            this.CurrentUserId(),
            isRead,
            Math.Max(page, 1),
            Math.Clamp(pageSize, 1, 100),
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount(CancellationToken cancellationToken)
        => Ok(await _service.CountUnreadAsync(this.CurrentUserId(), cancellationToken));

    [HttpPost("{id:long}/read")]
    public async Task<IActionResult> MarkAsRead(long id, CancellationToken cancellationToken)
    {
        var result = await _service.MarkAsReadAsync(this.CurrentUserId(), id, cancellationToken);

        return result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken)
    {
        await _service.MarkAllAsReadAsync(this.CurrentUserId(), cancellationToken);

        return NoContent();
    }
}
