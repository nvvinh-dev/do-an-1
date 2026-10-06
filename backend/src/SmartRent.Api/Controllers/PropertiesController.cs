using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Api.Contracts;
using SmartRent.Api.Services;
using SmartRent.Infrastructure.Identity;

namespace SmartRent.Api.Controllers;

/// <summary>Khu trọ của Chủ trọ đang đăng nhập — BP-02. Quyền sở hữu do PropertyService kiểm tra.</summary>
[ApiController]
[Route("api/v1/properties")]
[Authorize(Roles = AppRoles.Landlord)]
public class PropertiesController : ControllerBase
{
    private readonly PropertyService _service;

    public PropertiesController(PropertyService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<IActionResult> Create(PropertyRequest request, CancellationToken cancellationToken)
    {
        var result = await _service.CreateAsync(this.CurrentUserId(), request, cancellationToken);

        return result.Succeeded
            ? Created($"/api/v1/properties/{result.Value!.Id}", result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] bool includeArchived = false,
        CancellationToken cancellationToken = default)
    {
        return Ok(await _service.ListAsync(this.CurrentUserId(), includeArchived, cancellationToken));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Detail(long id, CancellationToken cancellationToken)
    {
        var result = await _service.GetAsync(this.CurrentUserId(), id, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, PropertyRequest request, CancellationToken cancellationToken)
    {
        var result = await _service.UpdateAsync(this.CurrentUserId(), id, request, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }
}
