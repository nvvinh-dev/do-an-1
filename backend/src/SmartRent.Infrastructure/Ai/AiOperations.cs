namespace SmartRent.Infrastructure.Ai;

/// <summary>Tên các endpoint gọi AI (api-design.md mục 15, 16), dùng cho log và bản AI giả.</summary>
public static class AiOperations
{
    /// <summary><c>POST /api/v1/rooms/search/interpret</c> — chuyển câu tìm phòng thành bộ lọc.</summary>
    public const string SearchInterpret = "rooms-search-interpret";

    /// <summary><c>POST /api/v1/assistant/questions</c> — hỏi trợ lý.</summary>
    public const string AssistantQuestion = "assistant-questions";

    /// <summary><c>GET /api/v1/roommate-profiles/{id}/match-explanation</c> — giải thích điểm ở ghép.</summary>
    public const string MatchExplanation = "roommate-match-explanation";
}
