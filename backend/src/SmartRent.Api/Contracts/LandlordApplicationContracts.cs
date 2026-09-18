using SmartRent.Domain.Enums;

namespace SmartRent.Api.Contracts;

public record SubmitLandlordApplicationRequest(
    string IdCardNumber,
    string IdCardFrontPath,
    string IdCardBackPath,
    string OwnershipDocumentPath);

/// <summary>
/// Thông tin hồ sơ trả cho chính người nộp. Không chứa số CCCD và không chứa
/// đường dẫn ảnh giấy tờ — người nộp đã biết mình gửi gì.
/// </summary>
public record LandlordApplicationResponse(
    long Id,
    LandlordApplicationStatus Status,
    DateTimeOffset SubmittedAt,
    DateTimeOffset? ReviewedAt,
    string? RejectReason);

/// <summary>
/// Chi tiết hồ sơ dành riêng cho Admin khi duyệt. Đây là nơi DUY NHẤT trong hệ thống
/// trả về số CCCD và ảnh giấy tờ, và ảnh được trả dưới dạng URL có chữ ký, có hạn.
/// </summary>
public record LandlordApplicationDetailResponse(
    long Id,
    long UserId,
    string ApplicantFullName,
    string ApplicantEmail,
    string? ApplicantPhoneNumber,
    string IdCardNumber,
    string IdCardFrontUrl,
    string IdCardBackUrl,
    string OwnershipDocumentUrl,
    LandlordApplicationStatus Status,
    DateTimeOffset SubmittedAt,
    DateTimeOffset? ReviewedAt,
    string? RejectReason);

/// <summary>Dòng trong danh sách hồ sơ chờ duyệt. Không chứa giấy tờ.</summary>
public record LandlordApplicationListItemResponse(
    long Id,
    long UserId,
    string ApplicantFullName,
    string ApplicantEmail,
    LandlordApplicationStatus Status,
    DateTimeOffset SubmittedAt);

public record RejectLandlordApplicationRequest(string Reason);
