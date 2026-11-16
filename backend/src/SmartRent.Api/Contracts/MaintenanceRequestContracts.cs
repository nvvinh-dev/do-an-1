using SmartRent.Domain.Enums;

namespace SmartRent.Api.Contracts;

/// <summary>
/// Người thuê báo sự cố — api-design mục 18. <see cref="ContractId"/> và <see cref="Urgency"/> khai báo nullable
/// để thiếu trường thì validator trả 400, thay vì nhận giá trị mặc định.
/// </summary>
public record ReportMaintenanceRequestRequest(
    long? ContractId,
    string Title,
    string Description,
    MaintenanceUrgency? Urgency,
    IReadOnlyList<string>? ImagePaths);

/// <summary>Dòng trong danh sách sự cố.</summary>
public record MaintenanceRequestListItemResponse(
    long Id,
    long ContractId,
    string RoomCode,
    string PropertyName,
    string Title,
    MaintenanceUrgency Urgency,
    MaintenanceRequestStatus Status,
    DateTimeOffset CreatedAt,
    DateOnly? ExpectedCompletionDate);

/// <summary>Ảnh sự cố — URL có chữ ký, hết hạn sau 1 giờ.</summary>
public record MaintenanceRequestImageResponse(string Url);

/// <summary>Chi tiết sự cố, cho cả Người thuê đứng tên và Chủ trọ sở hữu.</summary>
public record MaintenanceRequestDetailResponse(
    long Id,
    long ContractId,
    string RoomCode,
    string PropertyName,
    string TenantFullName,
    string Title,
    string Description,
    MaintenanceUrgency Urgency,
    MaintenanceRequestStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? AcceptedAt,
    DateOnly? ExpectedCompletionDate,
    DateTimeOffset? CompletedAt,
    string? NotFixedReason,
    string? RejectionReason,
    decimal? EstimatedCompensation,
    DateTimeOffset? RejectedAt,
    DateTimeOffset? ClosedAt,
    bool IsAutoClosed,
    DateTimeOffset? CancelledAt,
    IReadOnlyList<MaintenanceRequestImageResponse> Images);
