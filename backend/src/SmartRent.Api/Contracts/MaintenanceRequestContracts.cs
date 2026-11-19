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

/// <summary>
/// Tiếp nhận sự cố hoặc sửa ngày dự kiến sửa xong — api-design mục 18. Trường được null; không trước hôm nay
/// (giờ Việt Nam).
/// </summary>
public record MaintenanceExpectedCompletionDateRequest(DateOnly? ExpectedCompletionDate);

/// <summary>Chủ trọ từ chối sự cố, kèm bồi thường dự kiến không bắt buộc (BP-08 A1).</summary>
public record RejectMaintenanceRequestRequest(string Reason, decimal? EstimatedCompensation);

/// <summary>Người thuê báo sự cố chưa được khắc phục.</summary>
public record MaintenanceNotFixedRequest(string Reason);
