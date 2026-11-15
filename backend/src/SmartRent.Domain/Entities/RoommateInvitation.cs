using SmartRent.Domain.Enums;

namespace SmartRent.Domain.Entities;

/// <summary>
/// Lời mời kết nối ở ghép (BP-11). Gắn với tài khoản chứ không với hồ sơ, nên kết nối đã chấp nhận vẫn còn
/// khi một bên xóa hồ sơ (FR-117).
/// </summary>
public class RoommateInvitation
{
    public long Id { get; set; }

    public long SenderUserId { get; set; }

    public long RecipientUserId { get; set; }

    public RoommateInvitationStatus Status { get; set; }

    public DateTimeOffset SentAt { get; set; }

    /// <summary>Lúc chấp nhận, từ chối hoặc rút.</summary>
    public DateTimeOffset? RespondedAt { get; set; }
}
