using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Api.Services;

namespace SmartRent.Api.Controllers;

/// <summary>Danh mục tiện ích cho bộ lọc tìm kiếm và form khu trọ, phòng — công khai.</summary>
[ApiController]
[Route("api/v1/amenities")]
[AllowAnonymous]
public class AmenitiesController : ControllerBase
{
    private readonly RoomSearchService _service;

    public AmenitiesController(RoomSearchService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
        => Ok(await _service.ListAmenitiesAsync(cancellationToken));
}
