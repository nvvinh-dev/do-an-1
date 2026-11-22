namespace SmartRent.Infrastructure.Ai;

/// <summary>
/// Lớp dùng chung cho mọi lần gọi AI (FR-121). Service nghiệp vụ chỉ biết interface này,
/// không biết đang gọi Gemini thật hay bản giả (<c>Gemini:UseFake</c>).
/// </summary>
/// <remarks>
/// Mọi kiểu thất bại — chưa cấu hình key, quá 10 giây, hết hạn mức, Gemini lỗi, câu trả lời rỗng
/// hoặc bị chặn — đều ném <see cref="AiUnavailableException"/>. Service bắt exception này và trả
/// <c>ServiceResult.Fail(503, AiUnavailableException.UserMessage)</c>; không để lọt ra ngoài thành 500.
/// Lớp này không lưu câu hỏi, câu trả lời và không ghi nội dung vào log (FR-123): dữ liệu đưa vào
/// <see cref="AiRequest"/> phải được service lọc sẵn, chỉ gồm các trường cần cho câu hỏi.
/// </remarks>
public interface IAiClient
{
    /// <returns>
    /// Văn bản AI trả về. Khi <see cref="AiRequest.ResponseJsonSchema"/> có giá trị,
    /// đây là chuỗi JSON theo schema đó — service tự parse và tự kiểm tra lại từng giá trị.
    /// </returns>
    /// <exception cref="AiUnavailableException">AI không dùng được ở lần gọi này.</exception>
    Task<string> GenerateAsync(AiRequest request, CancellationToken cancellationToken = default);
}
