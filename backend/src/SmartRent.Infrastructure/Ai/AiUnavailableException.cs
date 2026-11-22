namespace SmartRent.Infrastructure.Ai;

/// <summary>
/// AI không dùng được ở lần gọi này: chưa cấu hình key, quá thời gian chờ, hết hạn mức,
/// Gemini lỗi hoặc câu trả lời rỗng. Endpoint AI trả <c>503</c>, chức năng lõi không bị ảnh hưởng (FR-121).
/// </summary>
/// <remarks>
/// <see cref="Exception.Message"/> chỉ dùng cho log, không gửi cho người dùng —
/// <c>detail</c> của response lấy <see cref="UserMessage"/>.
/// </remarks>
public class AiUnavailableException : Exception
{
    /// <summary>Nội dung <c>detail</c> của response <c>503</c>.</summary>
    public const string UserMessage =
        "Tính năng AI tạm thời không dùng được. Các chức năng khác vẫn hoạt động bình thường.";

    public AiUnavailableException(string message, Exception? innerException = null)
        : base(message, innerException)
    {
    }
}
