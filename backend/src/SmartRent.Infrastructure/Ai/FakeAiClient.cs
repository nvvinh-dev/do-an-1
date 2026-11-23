namespace SmartRent.Infrastructure.Ai;

/// <summary>
/// Bản AI giả cài cùng interface với <see cref="GeminiClient"/>, trả kết quả cố định theo
/// <see cref="AiRequest.Operation"/>. Bật bằng <c>Gemini:UseFake = true</c> khi chạy thử hằng ngày,
/// để không cạn hạn mức của project Gemini (testing-strategy.md mục 3).
/// </summary>
/// <remarks>
/// Chức năng nào cần câu trả lời mẫu riêng (JSON theo schema của chức năng đó) thì thêm vào
/// <see cref="CannedResponses"/> cùng lúc viết chức năng.
/// </remarks>
public class FakeAiClient : IAiClient
{
    private static readonly IReadOnlyDictionary<string, string> CannedResponses =
        new Dictionary<string, string>
        {
            // Hợp đồng #1 chỉ còn trong response khi thuộc người hỏi — dùng để thấy server lọc references (FR-129).
            [AiOperations.AssistantQuestion] =
                """{"answer":"[AI giả] Đây là câu trả lời mẫu của trợ lý, không gọi Gemini.","references":[{"type":"Contract","id":1}]}"""
        };

    private const string DefaultTextResponse = "[AI giả] Đây là câu trả lời mẫu, không gọi Gemini.";

    private const string DefaultJsonResponse = "{}";

    public Task<string> GenerateAsync(AiRequest request, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (CannedResponses.TryGetValue(request.Operation, out var canned))
        {
            return Task.FromResult(canned);
        }

        return Task.FromResult(request.ResponseJsonSchema is null ? DefaultTextResponse : DefaultJsonResponse);
    }
}
