using SmartRent.Domain.Enums;

namespace SmartRent.Api.Contracts;

/// <summary>Hỏi trợ lý AI — api-design mục 16. Mỗi câu hỏi độc lập, không có lịch sử hội thoại (FR-131).</summary>
public record AskAssistantRequest(string Question);

/// <summary>Một bản ghi câu trả lời nhắc tới, giao diện hiện thành liên kết (FR-129).</summary>
public record AssistantReferenceResponse(AssistantReferenceType Type, long Id);

/// <summary>
/// Câu trả lời của trợ lý. <see cref="References"/> chỉ chứa bản ghi có trong dữ liệu server đã gửi cho AI, nên đều
/// thuộc quyền người hỏi (FR-129).
/// </summary>
public record AssistantAnswerResponse(string Answer, IReadOnlyList<AssistantReferenceResponse> References);
