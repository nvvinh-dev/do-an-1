using SmartRent.Domain.Enums;

namespace SmartRent.Api.Contracts;

/// <summary>Điểm từng tiêu chí, từ 0 tới 1 (FR-109 đến FR-113).</summary>
public record RoommateMatchScoresResponse(decimal Budget, decimal Habits, decimal Area, decimal Organization);

/// <summary>
/// Một ứng viên của <c>GET /roommate-profiles/matches</c> — api-design mục 15. <c>Score</c> là số nguyên phần trăm;
/// <c>Profile</c> chỉ có phần không định danh (FR-114).
/// </summary>
public record RoommateMatchResponse(
    long ProfileId,
    int Score,
    RoommateMatchScoresResponse Scores,
    RoommateProfilePublicResponse Profile);

/// <summary>
/// Một lời mời đã gửi hoặc đã nhận. <c>ProfileId</c> là hồ sơ của bên kia, <c>null</c> khi bên kia đã xóa hồ sơ;
/// không có họ tên hay số điện thoại (BR-25).
/// </summary>
public record RoommateInvitationResponse(
    long Id,
    RoommateInvitationStatus Status,
    DateTimeOffset SentAt,
    DateTimeOffset? RespondedAt,
    long? ProfileId);

/// <summary>Một kết nối đã chấp nhận, kèm họ tên và số điện thoại của bên kia (FR-117, QR-07).</summary>
public record RoommateConnectionResponse(
    long InvitationId,
    DateTimeOffset ConnectedAt,
    string FullName,
    string? PhoneNumber);

/// <summary>Một lượt chặn của chính người gọi. <c>ProfileId</c> là <c>null</c> khi người bị chặn không còn hồ sơ.</summary>
public record RoommateBlockResponse(long Id, DateTimeOffset BlockedAt, long? ProfileId);

/// <summary>
/// Đoạn giải thích điểm phù hợp do AI viết — <c>GET /roommate-profiles/{id}/match-explanation</c> (FR-120). Không lưu;
/// điểm vẫn lấy từ <c>/matches</c>.
/// </summary>
public record RoommateMatchExplanationResponse(string Explanation);
