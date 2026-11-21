using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Api.Contracts;
using SmartRent.Api.Services;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Controllers;

/// <summary>
/// Lời mời kết nối ở ghép — BP-11, FR-115, api-design mục 15. Gửi lời mời nằm ở
/// <c>POST /roommate-profiles/{id}/invitations</c>. Sai vai trả 404, lời mời không còn chờ trả 409, thành công trả 204.
/// </summary>
[ApiController]
[Route("api/v1/roommate-invitations")]
[Authorize(Roles = AppRoles.Tenant)]
public class RoommateInvitationsController : ControllerBase
{
    private const int MaxPage = 1_000_000;

    private readonly RoommateConnectionService _service;

    public RoommateInvitationsController(RoommateConnectionService service)
    {
        _service = service;
    }

    /// <summary>Lời mời đã gửi hoặc đã nhận, mới nhất trước; không có họ tên hay số điện thoại.</summary>
    /// <param name="direction"><c>sent</c> hoặc <c>received</c>, bắt buộc.</param>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? direction,
        [FromQuery] RoommateInvitationStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        bool sent;

        switch (direction?.ToLowerInvariant())
        {
            case "sent":
                sent = true;
                break;
            case "received":
                sent = false;
                break;
            default:
                return Problem(
                    detail: "direction bắt buộc, chỉ nhận sent hoặc received.",
                    statusCode: StatusCodes.Status400BadRequest);
        }

        var result = await _service.ListInvitationsAsync(
            this.CurrentUserId(),
            sent,
            status,
            Math.Clamp(page, 1, MaxPage),
            Math.Clamp(pageSize, 1, 100),
            cancellationToken);

        return Ok(result);
    }

    /// <summary>Người nhận chấp nhận: Chờ phản hồi → Đã chấp nhận.</summary>
    [HttpPost("{id:long}/accept")]
    public async Task<IActionResult> Accept(long id, CancellationToken cancellationToken)
        => ToResponse(await _service.AcceptAsync(this.CurrentUserId(), id, cancellationToken));

    /// <summary>Người nhận từ chối: Chờ phản hồi → Từ chối.</summary>
    [HttpPost("{id:long}/reject")]
    public async Task<IActionResult> Reject(long id, CancellationToken cancellationToken)
        => ToResponse(await _service.RejectAsync(this.CurrentUserId(), id, cancellationToken));

    /// <summary>Người gửi rút: Chờ phản hồi → Đã rút.</summary>
    [HttpPost("{id:long}/withdraw")]
    public async Task<IActionResult> Withdraw(long id, CancellationToken cancellationToken)
        => ToResponse(await _service.WithdrawAsync(this.CurrentUserId(), id, cancellationToken));

    private IActionResult ToResponse(ServiceResult result)
        => result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
}
