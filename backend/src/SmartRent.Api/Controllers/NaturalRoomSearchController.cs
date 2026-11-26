using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartRent.Api.Contracts;
using SmartRent.Api.Services;

namespace SmartRent.Api.Controllers;

/// <summary>
/// Tìm kiếm bằng ngôn ngữ tự nhiên — BP-04 A1, api-design mục 16. Tách khỏi <see cref="PublicRoomsController"/> vì
/// controller đó cho phép Khách ở mức lớp, còn endpoint này chỉ cho người đã đăng nhập (FR-126).
/// </summary>
[ApiController]
[Route("api/v1/rooms/search")]
[Authorize]
public class NaturalRoomSearchController : ControllerBase
{
    private readonly NaturalRoomSearchService _service;

    public NaturalRoomSearchController(NaturalRoomSearchService service)
    {
        _service = service;
    }

    /// <summary>
    /// Chuyển câu tìm phòng thành bộ lọc của GET /rooms/search; không trả danh sách phòng (FR-124).
    /// Không rút ra được bộ lọc nào thì 422 (FR-125); AI lỗi thì 503 (FR-121).
    /// </summary>
    [HttpPost("interpret")]
    [EnableRateLimiting(RateLimitPolicies.Ai)]
    public async Task<IActionResult> Interpret(InterpretRoomSearchRequest request, CancellationToken cancellationToken)
    {
        var result = await _service.InterpretAsync(request.Query, cancellationToken);

        return result.Succeeded
            ? Ok(result.Value)
            : Problem(detail: result.Error, statusCode: result.StatusCode);
    }
}
