namespace SmartRent.Api.Services;

/// <summary>
/// File hỏi đáp cách dùng hệ thống (FR-130), nạp một lần từ Data/huong-dan-su-dung.md. Trợ lý chỉ trả lời câu hỏi
/// cách dùng từ file này; file do nhóm tự viết, sửa nội dung thì khởi động lại API.
/// </summary>
public class AssistantGuide
{
    public AssistantGuide()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Data", "huong-dan-su-dung.md");

        try
        {
            Content = File.ReadAllText(path).Trim();
        }
        catch (IOException ex)
        {
            throw new InvalidOperationException($"Khong doc duoc file huong dan su dung {path}: {ex.Message}", ex);
        }

        if (Content.Length == 0)
        {
            throw new InvalidOperationException($"File huong dan su dung rong: {path}");
        }
    }

    public string Content { get; }
}
