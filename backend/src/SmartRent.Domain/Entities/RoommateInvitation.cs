using SmartRent.Domain.Enums;

namespace SmartRent.Domain.Entities;

/// <summary>
/// Lời mời kết nối ở ghép (BP-11). Gắn với tài khoản chứ không với hồ sơ, nên kết nối đã chấp nhận vẫn còn
/// khi một bên xóa hồ sơ (FR-117). Vòng đời (FR-115): Chờ phản hồi → Đã chấp nhận, Từ chối hoặc Đã rút.
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

    public bool IsPending => Status == RoommateInvitationStatus.ChoPhanHoi;

    /// <summary>Hai bên đã kết nối: chỉ lúc này mới lộ họ tên và số điện thoại của nhau (FR-117, BR-25).</summary>
    public bool IsConnected => Status == RoommateInvitationStatus.DaChapNhan;

    /// <summary>Lời mời mới, Chờ phản hồi (FR-115). Lời mời không có hạn.</summary>
    public static RoommateInvitation Send(long senderUserId, long recipientUserId, DateTimeOffset now)
    {
        if (senderUserId == recipientUserId)
        {
            throw new InvalidOperationException("Không gửi lời mời kết nối cho chính mình.");
        }

        return new RoommateInvitation
        {
            SenderUserId = senderUserId,
            RecipientUserId = recipientUserId,
            Status = RoommateInvitationStatus.ChoPhanHoi,
            SentAt = now
        };
    }

    /// <summary>Người dùng là người gửi hoặc người nhận của lời mời này.</summary>
    public bool Involves(long userId) => SenderUserId == userId || RecipientUserId == userId;

    /// <summary>Bên kia của lời mời, nhìn từ <paramref name="userId"/>.</summary>
    public long OtherPartyOf(long userId) => SenderUserId == userId ? RecipientUserId : SenderUserId;

    /// <summary>
    /// FR-116: lời mời này (giữa <paramref name="senderUserId"/> và một người khác) chặn
    /// <paramref name="senderUserId"/> gửi lời mời mới cho người đó, và ẩn hồ sơ người đó khỏi danh sách ứng viên
    /// của <paramref name="senderUserId"/> — khi lời mời đang chờ hoặc đã kết nối theo bất kỳ chiều nào, hoặc người
    /// kia đã từ chối lời mời của <paramref name="senderUserId"/>. Lời mời đã rút, hay chính
    /// <paramref name="senderUserId"/> từ chối người kia, thì không chặn.
    /// </summary>
    public bool PreventsNewInvitationFrom(long senderUserId)
        => IsPending
           || IsConnected
           || (Status == RoommateInvitationStatus.TuChoi && SenderUserId == senderUserId);

    /// <summary>Chờ phản hồi → Đã chấp nhận: người nhận chấp nhận.</summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="IsPending"/> sai — lỗi lập trình.</exception>
    public void Accept(DateTimeOffset now) => Respond(RoommateInvitationStatus.DaChapNhan, now);

    /// <summary>Chờ phản hồi → Từ chối: người nhận từ chối.</summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="IsPending"/> sai — lỗi lập trình.</exception>
    public void Reject(DateTimeOffset now) => Respond(RoommateInvitationStatus.TuChoi, now);

    /// <summary>
    /// Chờ phản hồi → Đã rút: người gửi rút lời mời, hoặc hệ thống rút khi một bên xóa hồ sơ (FR-117) hay chặn
    /// bên kia (FR-118).
    /// </summary>
    /// <exception cref="InvalidOperationException">Gọi khi <see cref="IsPending"/> sai — lỗi lập trình.</exception>
    public void Withdraw(DateTimeOffset now) => Respond(RoommateInvitationStatus.DaRut, now);

    private void Respond(RoommateInvitationStatus target, DateTimeOffset now)
    {
        if (!IsPending)
        {
            throw new InvalidOperationException($"Lời mời {Id} ở trạng thái {Status}: không chuyển sang {target} được.");
        }

        Status = target;
        RespondedAt = now;
    }
}
