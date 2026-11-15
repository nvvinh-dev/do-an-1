using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;

namespace SmartRent.Api;

/// <summary>
/// Hai thao tác cùng đổi một bản ghi có concurrency token (xmin) — ví dụ duyệt và rút cùng một yêu cầu thuê —
/// thì bên lưu sau nhận <see cref="DbUpdateConcurrencyException"/>. Lưới an toàn cho mọi endpoint: trả 409 thay vì 500.
/// Các service vẫn tự bắt lỗi này ở hàm lưu dùng chung, vì tác vụ định kỳ gọi các hàm đó và cần chạy tiếp
/// qua bản ghi khác thay vì dừng cả lượt.
/// </summary>
public class ConcurrencyConflictExceptionHandler : IExceptionHandler
{
    private readonly IProblemDetailsService _problemDetailsService;

    public ConcurrencyConflictExceptionHandler(IProblemDetailsService problemDetailsService)
    {
        _problemDetailsService = problemDetailsService;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is not DbUpdateConcurrencyException)
        {
            return false;
        }

        httpContext.Response.StatusCode = StatusCodes.Status409Conflict;

        return await _problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails =
            {
                Status = StatusCodes.Status409Conflict,
                Detail = "Dữ liệu vừa được thay đổi bởi một thao tác khác. Vui lòng tải lại trang và thử lại."
            }
        });
    }
}
