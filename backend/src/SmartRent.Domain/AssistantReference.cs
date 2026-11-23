using SmartRent.Domain.Enums;

namespace SmartRent.Domain;

/// <summary>Một bản ghi câu trả lời của trợ lý nhắc tới (FR-129).</summary>
public readonly record struct AssistantReference(AssistantReferenceType Type, long Id);
