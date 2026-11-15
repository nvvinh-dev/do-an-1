using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Api.Services;

namespace SmartRent.Api.Controllers;

/// <summary>Danh mục tỉnh/thành – phường/xã cho ô chọn địa chỉ và bộ lọc khu vực — công khai.</summary>
[ApiController]
[Route("api/v1/locations")]
[AllowAnonymous]
public class LocationsController : ControllerBase
{
    private readonly LocationCatalog _catalog;

    public LocationsController(LocationCatalog catalog)
    {
        _catalog = catalog;
    }

    [HttpGet]
    public IActionResult List() => Ok(_catalog.All);
}
