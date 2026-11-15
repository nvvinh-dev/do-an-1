namespace SmartRent.Api.Contracts;

/// <summary>Khung phân trang dùng chung cho mọi danh sách, theo docs/api-design.md mục 1.</summary>
public record PagedResponse<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalItems,
    int TotalPages);
