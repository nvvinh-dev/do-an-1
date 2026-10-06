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
}
