using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartRent.Api.Services;

namespace SmartRent.Api.Controllers;

/// <summary>Danh mục trường đại học, học viện và cao đẳng cho ô chọn trường ở hồ sơ ở ghép — công khai (FR-112).</summary>
[ApiController]
[Route("api/v1/schools")]
[AllowAnonymous]
public class SchoolsController : ControllerBase
{
    private readonly SchoolCatalog _catalog;

    public SchoolsController(SchoolCatalog catalog)
    {
        _catalog = catalog;
    }

    [HttpGet]
    public IActionResult List() => Ok(_catalog.All);
}
