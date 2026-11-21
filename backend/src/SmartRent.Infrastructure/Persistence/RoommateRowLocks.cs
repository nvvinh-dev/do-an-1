using Microsoft.EntityFrameworkCore;

namespace SmartRent.Infrastructure.Persistence;

/// <summary>
/// Khóa cho thao tác ở ghép chạy đồng thời (BP-11). Như <see cref="PropertyRowLocks"/>: gọi ngay sau khi mở
/// transaction, trước khi nạp entity; khóa giữ tới khi transaction kết thúc.
/// </summary>
public static class RoommateRowLocks
{
    /// <summary>
    /// Khóa dòng lời mời trước khi chấp nhận, từ chối hoặc rút: hai bên bấm cùng lúc thì bên sau chờ và đọc trạng
    /// thái mới, thay vì ghi đè. <c>roommate_invitations</c> không có concurrency token.
    /// </summary>
    public static Task LockRoommateInvitationAsync(
        this AppDbContext db,
        long invitationId,
        CancellationToken cancellationToken)
        => db.ExecuteLockAsync(
            $"SELECT 1 FROM roommate_invitations WHERE id = {invitationId} FOR UPDATE",
            cancellationToken);

    /// <summary>
    /// Khóa theo cặp người dùng (advisory lock, không phụ thuộc thứ tự hai id) khi gửi lời mời hoặc chặn: unique
    /// index chỉ chặn hai lời mời đang chờ cùng chiều, còn lời mời chiều ngược lại hay lời mời gửi đúng lúc bên kia
    /// chặn thì phải kiểm trong khóa này (FR-116, FR-118).
    /// </summary>
    public static Task LockRoommatePairAsync(
        this AppDbContext db,
        long userIdA,
        long userIdB,
        CancellationToken cancellationToken)
    {
        var key = $"roommate-pair:{Math.Min(userIdA, userIdB)}:{Math.Max(userIdA, userIdB)}";

        return db.ExecuteLockAsync($"SELECT pg_advisory_xact_lock(hashtextextended({key}, 0))", cancellationToken);
    }

    /// <summary>
    /// Khóa dòng hồ sơ của người xóa trước khi chuyển lời mời đang chờ sang Đã rút (FR-117): lời mời gửi cùng lúc
    /// giữ khóa <see cref="ShareRoommateProfilesAsync"/> nên một trong hai bên phải chờ bên kia commit.
    /// </summary>
    public static Task LockRoommateProfileAsync(
        this AppDbContext db,
        long tenantUserId,
        CancellationToken cancellationToken)
        => db.ExecuteLockAsync(
            $"SELECT 1 FROM roommate_profiles WHERE tenant_user_id = {tenantUserId} FOR UPDATE",
            cancellationToken);

    /// <summary>
    /// Khóa chia sẻ hồ sơ của người gửi và chủ hồ sơ khi gửi lời mời. Bên xóa hồ sơ đến trước thì bên gửi chờ rồi
    /// đọc lại thấy hồ sơ đã mất; bên gửi đến trước thì bên xóa chờ, câu UPDATE thấy lời mời mới và rút nó.
    /// </summary>
    public static Task ShareRoommateProfilesAsync(
        this AppDbContext db,
        long userIdA,
        long userIdB,
        CancellationToken cancellationToken)
        => db.ExecuteLockAsync(
            $"SELECT 1 FROM roommate_profiles WHERE tenant_user_id IN ({userIdA}, {userIdB}) FOR SHARE",
            cancellationToken);
}
