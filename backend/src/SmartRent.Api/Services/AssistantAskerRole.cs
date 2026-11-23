namespace SmartRent.Api.Services;

/// <summary>Vai trò người hỏi trợ lý, quyết định phạm vi dữ liệu gửi AI (FR-127, tài liệu phân tích mục 10.1).</summary>
public enum AssistantAskerRole
{
    Tenant,
    Landlord,
    Admin
}
