using System.Text.Json.Serialization;

namespace SmartRent.Api.Contracts;

/// <summary>Câu tìm phòng tự nhiên — POST /rooms/search/interpret (FR-124, FR-126). Tối đa 300 ký tự.</summary>
public record InterpretRoomSearchRequest(string Query);

/// <summary>
/// Bộ lọc rút ra từ câu hỏi và các ý chưa lọc được (FR-124, FR-125). Không có danh sách phòng: giao diện điền
/// <see cref="Filters"/> vào bộ lọc rồi gọi GET /rooms/search như bình thường.
/// </summary>
public record InterpretRoomSearchResponse(InterpretedRoomSearchFilters Filters, IReadOnlyList<string> Unsupported);

/// <summary>
/// Đúng các tham số của GET /rooms/search mà câu hỏi có nhắc tới; tham số không nhắc tới không có trong JSON.
/// Mọi giá trị đã được kiểm tra như tham số người dùng gửi, nên dùng thẳng được mà không bị <c>400</c>.
/// </summary>
public record InterpretedRoomSearchFilters(
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] decimal? MinPrice,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] decimal? MaxPrice,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] decimal? MinArea,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] decimal? MaxArea,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? City,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Ward,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] IReadOnlyList<long>? AmenityIds,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? MinOccupants,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? SortBy,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? SortDirection);
