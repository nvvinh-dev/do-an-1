using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartRent.Api.Contracts;
using SmartRent.Api.Services;

namespace SmartRent.Api.Controllers;

/// <summary>
/// Tìm phòng cho người chưa đăng nhập — BP-04, FR-21. Chỉ trả phòng đủ BR-05 và không có thông tin Chủ trọ.
/// </summary>
[ApiController]
[Route("api/v1/rooms")]
[AllowAnonymous]
public class PublicRoomsController : ControllerBase
{
    /// <summary>Trần của page để (page - 1) * pageSize không tràn số int.</summary>
    private const int MaxPage = 1_000_000;

    private const int MaxPageSize = 50;

    private readonly RoomSearchService _service;

    public PublicRoomsController(RoomSearchService service)
    {
        _service = service;
    }

    /// <summary>
    /// Bộ lọc theo api-design mục 6; ward thiếu city, khoảng giá hoặc diện tích ngược, giá trị âm,
    /// sortBy hoặc sortDirection lạ trả 400. pageSize mặc định 20, tối đa 50.
    /// </summary>
    [HttpGet("search")]
    [EnableRateLimiting(RateLimitPolicies.PublicSearch)]
    public async Task<IActionResult> Search(
        [FromQuery] RoomSearchQuery filter,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _service.SearchAsync(
            filter, Math.Clamp(page, 1, MaxPage), Math.Clamp(pageSize, 1, MaxPageSize), cancellationToken);

        return Ok(result);
    }
}
