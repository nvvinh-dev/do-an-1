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
    [EnableRateLimiting(RateLimitPolicies.FileUpload)]
    [RequestSizeLimit(PrivateMaxBytes)]
    public async Task<IActionResult> Upload(
        IFormFile file,
        [FromForm] FilePurpose purpose,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return Problem(detail: "Chưa chọn file.", statusCode: StatusCodes.Status400BadRequest);
        }

        if (!IsAllowedForRole(purpose))
        {
            return Problem(
                detail: "Vai trò của bạn không được phép tải loại file này.",
                statusCode: StatusCodes.Status403Forbidden);
        }

        var isPublic = purpose is FilePurpose.AnhKhuTro or FilePurpose.AnhPhong;

        if (file.Length > (isPublic ? PublicMaxBytes : PrivateMaxBytes))
        {
            return Problem(
                detail: $"File vượt quá giới hạn {(isPublic ? 5 : 10)} MB.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        await using var stream = file.OpenReadStream();

        // Không tin Content-Type hay phần mở rộng do client khai — loại file được
        // xác định từ các byte đầu của chính nội dung file.
        var header = new byte[12];
        var headerLength = await stream.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, cancellationToken);
        stream.Position = 0;

        var detected = DetectFileType(header.AsSpan(0, headerLength));
        var allowed = isPublic ? ImageTypes : [.. ImageTypes, "application/pdf"];

        if (detected is null || !allowed.Contains(detected.Value.ContentType))
        {
            return Problem(
                detail: "Định dạng file không được chấp nhận.",
                statusCode: StatusCodes.Status422UnprocessableEntity);
        }

        var stored = await _fileStorage.UploadAsync(
            purpose, this.CurrentUserId(), detected.Value.Extension, stream, detected.Value.ContentType, cancellationToken);

        // FR-10: ảnh giấy tờ nhân thân chỉ Admin được xem, kể cả người vừa tải lên cũng
        // không nhận URL xem lại — giao diện xem trước bằng file đang có trong trình duyệt.
        var url = purpose == FilePurpose.GiayToNhanThan ? null : stored.Url;

        return Ok(new FileUploadResponse(stored.Path, url, purpose));
    }

    /// <summary>
    /// Nhận diện loại file qua chữ ký ở đầu file. Trả về null khi không phải
    /// jpeg, png, webp hoặc pdf.
    /// </summary>
    private static (string ContentType, string Extension)? DetectFileType(ReadOnlySpan<byte> header)
    {
        if (header.StartsWith((ReadOnlySpan<byte>)[0xFF, 0xD8, 0xFF]))
        {
            return ("image/jpeg", ".jpg");
        }

        if (header.StartsWith((ReadOnlySpan<byte>)[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
        {
            return ("image/png", ".png");
        }

        if (header.Length >= 12 && header[..4].SequenceEqual("RIFF"u8) && header[8..12].SequenceEqual("WEBP"u8))
        {
            return ("image/webp", ".webp");
        }

        if (header.StartsWith("%PDF-"u8))
        {
            return ("application/pdf", ".pdf");
        }

        return null;
    }

    /// <summary>Mỗi loại file chỉ vai trò có nghiệp vụ tương ứng mới được tải lên.</summary>
    private bool IsAllowedForRole(FilePurpose purpose) => purpose switch
    {
        FilePurpose.GiayToNhanThan or FilePurpose.MinhChungThanhToan => User.IsInRole(AppRoles.Tenant),
        FilePurpose.AnhKhuTro or FilePurpose.AnhPhong or FilePurpose.AnhDongHo or FilePurpose.AnhHuHong
            => User.IsInRole(AppRoles.Landlord),
        _ => false
    };
}
