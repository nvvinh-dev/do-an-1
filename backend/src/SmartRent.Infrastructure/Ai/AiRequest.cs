namespace SmartRent.Infrastructure.Ai;

/// <summary>Một lần gọi AI. Mỗi câu hỏi của người dùng gọi AI đúng một lần (FR-128).</summary>
/// <param name="Operation">
/// Tên endpoint gọi AI, lấy từ <see cref="AiOperations"/>. Chỉ dùng để ghi log thời điểm,
/// endpoint và kết quả (FR-123).
/// </param>
/// <param name="SystemInstruction">Chỉ dẫn cố định của chức năng: vai trò, phạm vi, cách trả lời.</param>
/// <param name="UserContent">Câu hỏi của người dùng kèm dữ liệu server đã lọc sẵn.</param>
public sealed record AiRequest(string Operation, string SystemInstruction, string UserContent)
{
    /// <summary>
    /// JSON Schema của câu trả lời, ví dụ một object ẩn danh
    /// <c>new { type = "object", properties = new { answer = new { type = "string" } }, required = new[] { "answer" } }</c>.
    /// Để <c>null</c> thì AI trả văn bản thường.
    /// </summary>
    public object? ResponseJsonSchema { get; init; }
}
