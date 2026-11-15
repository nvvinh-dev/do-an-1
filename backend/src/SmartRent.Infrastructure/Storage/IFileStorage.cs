using SmartRent.Domain.Enums;

namespace SmartRent.Infrastructure.Storage;

public interface IFileStorage
{
    /// <param name="ownerUserId">Người tải file lên; được ghi vào đường dẫn để kiểm tra quyền về sau.</param>
    /// <param name="extension">
    /// Phần mở rộng dạng ".jpg", do server xác định từ nội dung file — không lấy từ tên file client gửi.
    /// </param>
    Task<StoredFile> UploadAsync(
        FilePurpose purpose,
        long ownerUserId,
        string extension,
        Stream content,
        string contentType,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Đường dẫn client gửi lên có đúng định dạng hệ thống sinh ra, đúng bucket,
    /// đúng loại <paramref name="purpose"/>, do chính <paramref name="ownerUserId"/> tải lên,
    /// và file thực sự tồn tại trên kho lưu trữ hay không.
    /// </summary>
    Task<bool> IsOwnedByAsync(
        string path,
        FilePurpose purpose,
        long ownerUserId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// URL vĩnh viễn của một file trong bucket công khai (ảnh khu trọ, ảnh phòng).
    /// Chỉ ghép chuỗi, không gọi Storage.
    /// </summary>
    string GetPublicUrl(string path);

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
