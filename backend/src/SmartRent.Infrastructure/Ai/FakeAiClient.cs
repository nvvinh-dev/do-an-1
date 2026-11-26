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
            // Câu mẫu ở api-design mục 16: phường không kèm tỉnh để thấy server tự suy tỉnh, một tiện ích không có
            // trong danh mục để thấy server đưa vào unsupported (FR-125).
            [AiOperations.SearchInterpret] =
                """{"maxPrice":3000000,"ward":"Linh Xuân","amenities":["Gác lửng","Hồ bơi"],"unsupported":["gần Đại học Công nghệ Thông tin"]}"""
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
