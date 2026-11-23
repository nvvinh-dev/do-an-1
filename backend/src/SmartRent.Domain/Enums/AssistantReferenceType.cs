namespace SmartRent.Domain.Enums;

/// <summary>
/// Loại bản ghi câu trả lời của trợ lý nhắc tới (FR-129, api-design mục 16). Tên giá trị là đúng chuỗi
/// <c>type</c> trong response, không lưu vào database.
/// </summary>
public enum AssistantReferenceType
{
    Contract,
    Invoice,
    Room,
    MaintenanceRequest
}
