using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Api.Contracts;
using SmartRent.Api.Services;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Controllers;

/// <summary>
/// Phòng trong khu trọ của Chủ trọ đang đăng nhập — BP-02. Quyền sở hữu truy qua khu trọ,
/// do PropertyService kiểm tra.
/// </summary>
[ApiController]
[Route("api/v1")]
[Authorize(Roles = AppRoles.Landlord)]
public class RoomsController : ControllerBase
{
    private readonly PropertyService _service;

    public RoomsController(PropertyService service)
    {
        _service = service;
    }

    [HttpPost("properties/{propertyId:long}/rooms")]
    public async Task<IActionResult> Create(long propertyId, RoomRequest request, CancellationToken cancellationToken)
    {
        var result = await _service.CreateRoomAsync(this.CurrentUserId(), propertyId, request, cancellationToken);

        return result.Succeeded
            ? Created($"/api/v1/rooms/{result.Value!.Id}", result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    [HttpGet("properties/{propertyId:long}/rooms")]
    public async Task<IActionResult> List(
        long propertyId,
        [FromQuery] bool includeArchived = false,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.ListRoomsAsync(this.CurrentUserId(), propertyId, includeArchived, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    [HttpGet("rooms/{id:long}")]
    public async Task<IActionResult> Detail(long id, CancellationToken cancellationToken)
    {
        var result = await _service.GetRoomAsync(this.CurrentUserId(), id, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    [HttpPut("rooms/{id:long}")]
    public async Task<IActionResult> Update(long id, RoomRequest request, CancellationToken cancellationToken)
    {
        var result = await _service.UpdateRoomAsync(this.CurrentUserId(), id, request, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    [HttpPatch("rooms/{id:long}/visibility")]
    public async Task<IActionResult> ChangeVisibility(
        long id,
        RoomVisibilityRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.ChangeVisibilityAsync(
            this.CurrentUserId(), id, request.VisibilityStatus!.Value, cancellationToken);

        return result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    [HttpPatch("rooms/{id:long}/occupancy-status")]
    public async Task<IActionResult> ChangeOccupancyStatus(
        long id,
        RoomOccupancyRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _service.ChangeOccupancyStatusAsync(
            this.CurrentUserId(), id, request.OccupancyStatus!.Value, cancellationToken);

        return result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    /// <summary>Lưu trữ là vĩnh viễn; không có DELETE (BR-09).</summary>
    [HttpPost("rooms/{id:long}/archive")]
    public async Task<IActionResult> Archive(long id, CancellationToken cancellationToken)
    {
        var result = await _service.ArchiveRoomAsync(this.CurrentUserId(), id, cancellationToken);

        return result.Succeeded
            ? NoContent()
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }
}
