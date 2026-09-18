using SmartRent.Domain.Enums;

namespace SmartRent.Api.Contracts;

/// <summary>
/// Kết quả tải file lên. <paramref name="Path"/> là giá trị client gửi lại trong request
/// nghiệp vụ tiếp theo; <paramref name="Url"/> chỉ để hiển thị xem trước.
/// </summary>
public record FileUploadResponse(string Path, string Url, FilePurpose Purpose);
