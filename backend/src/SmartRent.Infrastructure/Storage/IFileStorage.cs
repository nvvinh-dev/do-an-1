using SmartRent.Domain.Enums;

namespace SmartRent.Infrastructure.Storage;

/// <summary>Kết quả sau khi tải một file lên kho lưu trữ.</summary>
/// <param name="Path">Đường dẫn nội bộ dạng "bucket/thu-muc/ten-file", dùng để tra cứu về sau.</param>
/// <param name="Url">
/// Địa chỉ trả về cho client. File công khai thì đây là URL vĩnh viễn;
/// file riêng tư thì đây là URL có chữ ký và sẽ hết hạn.
/// </param>
public record StoredFile(string Path, string Url);

public interface IFileStorage
{
    Task<StoredFile> UploadAsync(
        FilePurpose purpose,
        string fileName,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Tạo URL có chữ ký, có hạn cho một file trong bucket riêng tư.
    /// Chỉ gọi sau khi đã kiểm tra người yêu cầu có quyền xem file đó.
    /// </summary>
    Task<string> CreateSignedUrlAsync(
        string path,
        TimeSpan lifetime,
        CancellationToken cancellationToken = default);

    Task DeleteAsync(string path, CancellationToken cancellationToken = default);
}
