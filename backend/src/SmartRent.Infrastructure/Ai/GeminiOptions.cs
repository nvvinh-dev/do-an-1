namespace SmartRent.Infrastructure.Ai;

public class GeminiOptions
{
    public const string SectionName = "Gemini";

    /// <summary>
    /// Khóa tạo trong Google AI Studio, đặt bằng User Secrets. Chỉ dùng ở backend, không bao giờ gửi ra client.
    /// Để trống thì ứng dụng vẫn chạy, mọi endpoint AI trả <c>503</c>.
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>Tên model, đổi bằng cấu hình mà không sửa code (FR-121).</summary>
    public string Model { get; set; } = "gemini-3.5-flash-lite";

    /// <summary>
    /// <c>true</c> thì dùng <see cref="FakeAiClient"/> trả kết quả cố định, không gọi Gemini,
    /// để chạy thử hằng ngày không tốn hạn mức (testing-strategy.md mục 3).
    /// </summary>
    public bool UseFake { get; set; }
}
