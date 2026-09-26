using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SmartRent.Api.Contracts;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Identity;
using SmartRent.Infrastructure.Storage;

namespace SmartRent.Api.Controllers;

/// <summary>
/// Endpoint tải file dùng chung cho mọi loại ảnh của hệ thống.
/// Trả về đường dẫn để gắn vào request nghiệp vụ tiếp theo.
/// </summary>
[ApiController]
[Route("api/v1/files")]
[Authorize]
public class FilesController : ControllerBase
{
    private const long PublicMaxBytes = 5 * 1024 * 1024;
    private const long PrivateMaxBytes = 10 * 1024 * 1024;

    private static readonly string[] ImageTypes = ["image/jpeg", "image/png", "image/webp"];

    private readonly IFileStorage _fileStorage;

    public FilesController(IFileStorage fileStorage)
    {
        _fileStorage = fileStorage;
    }

    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.BusinessWrite)]
    [RequestSizeLimit(PrivateMaxBytes)]
    public async Task<IActionResult> Upload(
        IFormFile file,
        [FromForm] FilePurpose purpose,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return Problem(detail: "Chua chon file.", statusCode: StatusCodes.Status400BadRequest);
        }

        if (!IsAllowedForRole(purpose))
        {
            return Problem(
                detail: "Vai tro cua ban khong duoc phep tai loai file nay.",
                statusCode: StatusCodes.Status403Forbidden);
        }

        var isPublic = purpose is FilePurpose.AnhKhuTro or FilePurpose.AnhPhong;

        if (file.Length > (isPublic ? PublicMaxBytes : PrivateMaxBytes))
        {
            return Problem(
                detail: $"File vuot qua gioi han {(isPublic ? 5 : 10)} MB.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        // Không tin Content-Type do client khai — chỉ chấp nhận danh sách đã cho phép.
        var allowed = isPublic ? ImageTypes : [.. ImageTypes, "application/pdf"];

        if (!allowed.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
        {
            return Problem(
                detail: "Dinh dang file khong duoc chap nhan.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        await using var stream = file.OpenReadStream();

        var stored = await _fileStorage.UploadAsync(
            purpose, file.FileName, stream, file.ContentType, cancellationToken);

        return Ok(new FileUploadResponse(stored.Path, stored.Url, purpose));
    }

    /// <summary>Mỗi loại file chỉ vai trò có nghiệp vụ tương ứng mới được tải lên.</summary>
    private bool IsAllowedForRole(FilePurpose purpose) => purpose switch
    {
        FilePurpose.GiayToNhanThan => true,
        FilePurpose.MinhChungThanhToan => User.IsInRole(AppRoles.Tenant),
        FilePurpose.AnhKhuTro or FilePurpose.AnhPhong or FilePurpose.AnhDongHo or FilePurpose.AnhHuHong
            => User.IsInRole(AppRoles.Landlord),
        _ => false
    };
}
