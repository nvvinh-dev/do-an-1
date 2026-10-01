namespace SmartRent.Infrastructure.Storage;

/// <summary>Kết quả sau khi tải một file lên kho lưu trữ.</summary>
/// <param name="Path">
/// Đường dẫn nội bộ dạng "bucket/purpose/id-nguoi-tai/nam/thang/ten-file".
/// Đây là giá trị client gửi lại trong request nghiệp vụ.
/// </param>
/// <param name="Url">
/// Địa chỉ để xem. File công khai thì đây là URL vĩnh viễn;
/// file riêng tư thì đây là URL có chữ ký và sẽ hết hạn.
/// </param>
public record StoredFile(string Path, string Url);
