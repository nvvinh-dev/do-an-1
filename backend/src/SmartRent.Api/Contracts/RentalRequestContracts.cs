using SmartRent.Domain.Enums;

namespace SmartRent.Api.Contracts;

/// <summary>
/// Người thuê gửi yêu cầu thuê. Hai trường số và ngày khai báo nullable để thiếu trường thì
/// validator trả 400, thay vì nhận giá trị mặc định.
/// </summary>
public record SubmitRentalRequestRequest(
    DateOnly? ExpectedMoveInDate,
    int? ExpectedOccupants,
    string? Note);

/// <summary>Từ chối, hoặc hủy duyệt khi chưa lập hợp đồng — lý do bắt buộc.</summary>
public record RejectRentalRequestRequest(string Reason);

/// <summary>Phòng gắn với yêu cầu thuê hoặc hợp đồng.</summary>
public record RoomReferenceResponse(long Id, string Code, string PropertyName);

/// <summary>
/// Dòng trong danh sách yêu cầu thuê. <see cref="ExpiresAt"/> chỉ có khi chờ duyệt,
/// <see cref="HoldExpiresAt"/> chỉ có khi đã duyệt — để giao diện đếm ngược.
/// </summary>
public record RentalRequestListItemResponse(
    long Id,
    RoomReferenceResponse Room,
    string TenantName,
    DateOnly ExpectedMoveInDate,
    int ExpectedOccupants,
    RentalRequestStatus Status,
    DateTimeOffset SubmittedAt,
    DateTimeOffset? ExpiresAt,
    DateTimeOffset? HoldExpiresAt);

/// <summary>
/// Chi tiết yêu cầu thuê. <see cref="OtherPartyPhoneNumber"/> là số của bên còn lại,
/// chỉ có khi yêu cầu ở Đã duyệt (QR-07).
/// </summary>
public record RentalRequestDetailResponse(
    long Id,
    RoomReferenceResponse Room,
    string TenantName,
    DateOnly ExpectedMoveInDate,
    int ExpectedOccupants,
    RentalRequestStatus Status,
    DateTimeOffset SubmittedAt,
    DateTimeOffset? ExpiresAt,
    DateTimeOffset? HoldExpiresAt,
    string? Note,
    DateTimeOffset? ProcessedAt,
    string? RejectReason,
    long? ContractId,
    string? OtherPartyPhoneNumber);
