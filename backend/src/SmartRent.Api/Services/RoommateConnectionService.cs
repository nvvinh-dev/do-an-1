using Microsoft.EntityFrameworkCore;
using Npgsql;
using SmartRent.Api.Contracts;
using SmartRent.Domain;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Persistence;

namespace SmartRent.Api.Services;

/// <summary>
/// Kết nối hai bên ở ghép — BP-11, FR-107, FR-113 đến FR-119, api-design mục 15: danh sách ứng viên, xem hồ sơ người
/// khác, lời mời, kết nối và chặn. Họ tên, số điện thoại chỉ lộ ở danh sách kết nối, sau khi lời mời được chấp nhận
/// (BR-25, QR-07); mọi chỗ khác trả hồ sơ qua <see cref="RoommateProfileService.ToPublicResponse"/>. Hồ sơ không xem
/// được — không có, của chính mình, bị chặn, hay không nằm trong danh sách ứng viên và không có lời mời giữa hai bên —
/// đều trả 404 như nhau. Không ghi audit_logs (không thuộc BR-23).
/// </summary>
public class RoommateConnectionService
{
    private const string InvitationEvent = "LoiMoiKetNoiOGhep";
    private const string InvitationAcceptedEvent = "LoiMoiKetNoiDuocChapNhan";

    private const string ProfileNotFoundMessage = "Không tìm thấy hồ sơ ở ghép.";
    private const string InvitationNotFoundMessage = "Không tìm thấy lời mời kết nối.";
    /// <summary>Dùng chung với giải thích điểm (RoommateMatchExplanationService) để cùng một thông điệp.</summary>
    internal const string NoProfileMessage = "Bạn cần tạo hồ sơ ở ghép trước.";
    private const string NoPhoneMessage =
        "Bạn cần cập nhật số điện thoại trong tài khoản trước: số này chỉ hiện cho bên kia sau khi hai bên kết nối.";
    private const string BlockingContractMessage =
        "Bạn đang có hợp đồng thuê đang hiệu lực nên chưa dùng được chức năng ở ghép.";
    private const string NotPendingMessage = "Lời mời không còn chờ phản hồi.";

    private readonly AppDbContext _db;
    private readonly Notifier _notifier;

    public RoommateConnectionService(AppDbContext db, Notifier notifier)
    {
        _db = db;
        _notifier = notifier;
    }

    /// <summary>FR-113: tối đa 20 ứng viên kèm điểm, tính lại mỗi lần gọi.</summary>
    public async Task<ServiceResult<IReadOnlyList<RoommateMatchResponse>>> GetMatchesAsync(
        long viewerUserId,
        CancellationToken cancellationToken = default)
    {
        var ranked = await RankAsync(viewerUserId, cancellationToken);

        if (!ranked.Succeeded)
        {
            return ServiceResult<IReadOnlyList<RoommateMatchResponse>>.Fail(ranked.StatusCode, ranked.Error!);
        }

        IReadOnlyList<RoommateMatchResponse> matches = ranked.Value!
            .Select(m => new RoommateMatchResponse(
                m.Profile.Id,
                m.Score.Score,
                new RoommateMatchScoresResponse(m.Score.Budget, m.Score.Habits, m.Score.Area, m.Score.Organization),
                RoommateProfileService.ToPublicResponse(m.Profile)))
            .ToList();

        return ServiceResult<IReadOnlyList<RoommateMatchResponse>>.Ok(matches);
    }

    /// <summary>FR-114: phần không định danh của một hồ sơ mình xem được.</summary>
    public async Task<ServiceResult<RoommateProfilePublicResponse>> GetProfileAsync(
        long viewerUserId,
        long profileId,
        CancellationToken cancellationToken = default)
    {
        var profile = await FindViewableProfileAsync(viewerUserId, profileId, cancellationToken);

        return profile is null
            ? ServiceResult<RoommateProfilePublicResponse>.Fail(StatusCodes.Status404NotFound, ProfileNotFoundMessage)
            : ServiceResult<RoommateProfilePublicResponse>.Ok(RoommateProfileService.ToPublicResponse(profile));
    }

    /// <summary>
    /// FR-114 (dùng chung cho xem hồ sơ, gửi lời mời, chặn và giải thích điểm; gửi lời mời còn đòi hồ sơ đang là
    /// ứng viên — FR-115): hồ sơ của người khác mà
    /// <paramref name="viewerUserId"/> xem được — giữa hai bên có lời mời kết nối (mọi trạng thái), hoặc hồ sơ đang
    /// nằm trong danh sách ứng viên của người xem; và không bên nào chặn bên nào (FR-118). Không xem được thì
    /// <c>null</c>.
    /// </summary>
    public async Task<RoommateProfile?> FindViewableProfileAsync(
        long viewerUserId,
        long profileId,
        CancellationToken cancellationToken = default)
    {
        var profile = await _db.RoommateProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == profileId, cancellationToken);

        if (profile is null || profile.TenantUserId == viewerUserId)
        {
            return null;
        }

        var ownerUserId = profile.TenantUserId;

        if (await IsBlockedEitherWayAsync(viewerUserId, ownerUserId, cancellationToken))
        {
            return null;
        }

        if (await BetweenPair(viewerUserId, ownerUserId).AnyAsync(cancellationToken))
        {
            return profile;
        }

        var ranked = await RankAsync(viewerUserId, cancellationToken);

        return ranked.Succeeded && ranked.Value!.Any(m => m.Profile.Id == profileId) ? profile : null;
    }

    /// <summary>
    /// FR-115, FR-116, FR-119: gửi lời mời Chờ phản hồi tới chủ một hồ sơ đang trong danh sách ứng viên của người
    /// gửi và thông báo cho người nhận (mức Thường).
    /// </summary>
    public async Task<ServiceResult<RoommateInvitationResponse>> SendInvitationAsync(
        long senderUserId,
        long profileId,
        CancellationToken cancellationToken = default)
    {
        var callerError = await CheckCallerCanUseAsync(senderUserId, cancellationToken);

        if (callerError is not null)
        {
            return ServiceResult<RoommateInvitationResponse>.Fail(callerError.StatusCode, callerError.Error!);
        }

        var ownerUserId = await _db.RoommateProfiles
            .Where(p => p.Id == profileId)
            .Select(p => (long?)p.TenantUserId)
            .FirstOrDefaultAsync(cancellationToken);

        if (ownerUserId is null || ownerUserId == senderUserId)
        {
            return ServiceResult<RoommateInvitationResponse>.Fail(StatusCodes.Status404NotFound, ProfileNotFoundMessage);
        }

        // Kiểm và tạo lời mời trong khóa theo cặp: lời mời chiều ngược lại hay lượt chặn gửi cùng lúc phải chờ.
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        await _db.LockRoommatePairAsync(senderUserId, ownerUserId.Value, cancellationToken);

        // Một trong hai bên xóa hồ sơ cùng lúc thì phải chờ, để không còn lời mời đang chờ gắn với hồ sơ đã xóa.
        await _db.ShareRoommateProfilesAsync(senderUserId, ownerUserId.Value, cancellationToken);

        // Kiểm lại trong khóa: người gửi có thể vừa xóa hồ sơ của mình.
        callerError = await CheckCallerCanUseAsync(senderUserId, cancellationToken);

        if (callerError is not null)
        {
            return ServiceResult<RoommateInvitationResponse>.Fail(callerError.StatusCode, callerError.Error!);
        }

        if (await FindViewableProfileAsync(senderUserId, profileId, cancellationToken) is null)
        {
            return ServiceResult<RoommateInvitationResponse>.Fail(StatusCodes.Status404NotFound, ProfileNotFoundMessage);
        }

        if (!await HasPhoneNumberAsync(senderUserId, cancellationToken))
        {
            return ServiceResult<RoommateInvitationResponse>.Fail(StatusCodes.Status422UnprocessableEntity, NoPhoneMessage);
        }

        var existing = await BetweenPair(senderUserId, ownerUserId.Value).AsNoTracking().ToListAsync(cancellationToken);

        if (existing.Any(i => i.PreventsNewInvitationFrom(senderUserId)))
        {
            return ServiceResult<RoommateInvitationResponse>.Fail(
                StatusCodes.Status409Conflict,
                "Không gửi được lời mời: hai bên đang có lời mời chờ phản hồi, đã kết nối, " +
                "hoặc người này đã từ chối lời mời của bạn.");
        }

        // FR-115: lời mời cũ chỉ mở quyền xem; gửi mới thì hồ sơ phải đang là ứng viên của người gửi, để người đã
        // tạm dừng hay chuyển sang Chỉ khi tôi kết nối không bị gửi lại sau mỗi lần rút. Không nói lý do cụ thể.
        // Giữa hai bên chưa có lời mời nào thì FindViewableProfileAsync đã xếp hạng và xác nhận hồ sơ là ứng viên,
        // chỉ xếp hạng lại khi hồ sơ xem được nhờ lời mời cũ.
        if (existing.Count > 0)
        {
            var ranked = await RankAsync(senderUserId, cancellationToken);

            if (!ranked.Succeeded || !ranked.Value!.Any(m => m.Profile.Id == profileId))
            {
                return ServiceResult<RoommateInvitationResponse>.Fail(
                    StatusCodes.Status409Conflict, "Hồ sơ này hiện không nhận lời mời mới từ bạn.");
            }
        }

        var invitation = RoommateInvitation.Send(senderUserId, ownerUserId.Value, DateTimeOffset.UtcNow);

        // Lưu lời mời trước để có id gắn vào thông báo; hai lần lưu nằm trong cùng transaction.
        _db.RoommateInvitations.Add(invitation);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return ServiceResult<RoommateInvitationResponse>.Fail(
                StatusCodes.Status409Conflict, "Bạn đã gửi lời mời cho người này và đang chờ phản hồi.");
        }

        _notifier.Notify(
            ownerUserId.Value,
            InvitationEvent,
            "Có lời mời kết nối ở ghép",
            "Một người thuê đang tìm bạn ở ghép đã gửi lời mời kết nối tới bạn. Chấp nhận thì hai bên thấy họ tên " +
            "và số điện thoại của nhau.",
            nameof(RoommateInvitation),
            invitation.Id);

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return ServiceResult<RoommateInvitationResponse>.Ok(new RoommateInvitationResponse(
            invitation.Id, invitation.Status, invitation.SentAt, invitation.RespondedAt, profileId));
    }

    /// <summary>Lời mời đã gửi (<paramref name="sent"/>) hoặc đã nhận, mới nhất trước.</summary>
    public async Task<PagedResponse<RoommateInvitationResponse>> ListInvitationsAsync(
        long userId,
        bool sent,
        RoommateInvitationStatus? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _db.RoommateInvitations.AsNoTracking();

        query = sent
            ? query.Where(i => i.SenderUserId == userId)
            : query.Where(i => i.RecipientUserId == userId);

        if (status is not null)
        {
            query = query.Where(i => i.Status == status);
        }

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(i => i.SentAt)
            .ThenByDescending(i => i.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new RoommateInvitationResponse(
                i.Id,
                i.Status,
                i.SentAt,
                i.RespondedAt,
                _db.RoommateProfiles
                    .Where(p => p.TenantUserId == (sent ? i.RecipientUserId : i.SenderUserId))
                    .Select(p => (long?)p.Id)
                    .FirstOrDefault()))
            .ToListAsync(cancellationToken);

        return new PagedResponse<RoommateInvitationResponse>(
            items, page, pageSize, total, (int)Math.Ceiling(total / (double)pageSize));
    }

    /// <summary>
    /// FR-115, FR-116, FR-117, FR-119: người nhận chấp nhận; hai bên từ đây thấy họ tên và số điện thoại của nhau.
    /// Người gửi nhận thông báo (mức Thường).
    /// </summary>
    public async Task<ServiceResult> AcceptAsync(
        long recipientUserId,
        long invitationId,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        await _db.LockRoommateInvitationAsync(invitationId, cancellationToken);

        var invitation = await _db.RoommateInvitations
            .FirstOrDefaultAsync(i => i.Id == invitationId, cancellationToken);

        if (invitation is null || invitation.RecipientUserId != recipientUserId)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, InvitationNotFoundMessage);
        }

        if (!invitation.IsPending)
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, NotPendingMessage);
        }

        if (!await HasPhoneNumberAsync(recipientUserId, cancellationToken))
        {
            return ServiceResult.Fail(StatusCodes.Status422UnprocessableEntity, NoPhoneMessage);
        }

        if (await HasBlockingContractAsync(recipientUserId, cancellationToken))
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, BlockingContractMessage);
        }

        invitation.Accept(DateTimeOffset.UtcNow);

        _notifier.Notify(
            invitation.SenderUserId,
            InvitationAcceptedEvent,
            "Lời mời kết nối ở ghép được chấp nhận",
            "Lời mời kết nối ở ghép của bạn đã được chấp nhận. Họ tên và số điện thoại của bạn ở ghép đã có trong " +
            "danh sách kết nối.",
            nameof(RoommateInvitation),
            invitation.Id);

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    /// <summary>FR-115: người nhận từ chối. Người gửi không gửi lại được cho người này (FR-116); không có thông báo.</summary>
    public Task<ServiceResult> RejectAsync(
        long recipientUserId,
        long invitationId,
        CancellationToken cancellationToken = default)
        => RespondAsync(
            invitationId,
            i => i.RecipientUserId == recipientUserId,
            (i, now) => i.Reject(now),
            cancellationToken);

    /// <summary>FR-115: người gửi rút lời mời còn chờ; không có thông báo.</summary>
    public Task<ServiceResult> WithdrawAsync(
        long senderUserId,
        long invitationId,
        CancellationToken cancellationToken = default)
        => RespondAsync(
            invitationId,
            i => i.SenderUserId == senderUserId,
            (i, now) => i.Withdraw(now),
            cancellationToken);

    /// <summary>FR-117: các lời mời đã chấp nhận, kèm họ tên và số điện thoại của bên kia; kết nối mới nhất trước.</summary>
    public async Task<IReadOnlyList<RoommateConnectionResponse>> ListConnectionsAsync(
        long userId,
        CancellationToken cancellationToken = default)
        => await (
                from i in _db.RoommateInvitations.AsNoTracking()
                where i.Status == RoommateInvitationStatus.DaChapNhan
                      && (i.SenderUserId == userId || i.RecipientUserId == userId)
                join u in _db.Users on (i.SenderUserId == userId ? i.RecipientUserId : i.SenderUserId) equals u.Id
                orderby i.RespondedAt descending, i.Id descending
                select new RoommateConnectionResponse(i.Id, i.RespondedAt!.Value, u.FullName, u.PhoneNumber))
            .ToListAsync(cancellationToken);

    /// <summary>
    /// FR-118: chặn chủ một hồ sơ mình xem được. Lời mời đang chờ giữa hai bên chuyển Đã rút, kết nối đã chấp nhận
    /// giữ nguyên. Đã chặn từ trước thì vẫn thành công.
    /// </summary>
    public async Task<ServiceResult> BlockAsync(
        long blockerUserId,
        long profileId,
        CancellationToken cancellationToken = default)
    {
        var ownerUserId = await _db.RoommateProfiles
            .Where(p => p.Id == profileId)
            .Select(p => (long?)p.TenantUserId)
            .FirstOrDefaultAsync(cancellationToken);

        if (ownerUserId is null || ownerUserId == blockerUserId)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, ProfileNotFoundMessage);
        }

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        await _db.LockRoommatePairAsync(blockerUserId, ownerUserId.Value, cancellationToken);

        // Chặn lại người mình đã chặn: hồ sơ đó không còn xem được, nhưng thao tác vẫn coi là thành công.
        var alreadyBlocked = await _db.RoommateBlocks.AnyAsync(
            b => b.BlockerUserId == blockerUserId && b.BlockedUserId == ownerUserId,
            cancellationToken);

        if (alreadyBlocked)
        {
            return ServiceResult.Ok();
        }

        if (await FindViewableProfileAsync(blockerUserId, profileId, cancellationToken) is null)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, ProfileNotFoundMessage);
        }

        var now = DateTimeOffset.UtcNow;

        // Cập nhật có điều kiện trạng thái trong câu UPDATE, như khi xóa hồ sơ: lời mời bên kia vừa chấp nhận cùng
        // lúc thì không bị ghi đè (FR-118 giữ kết nối).
        await BetweenPair(blockerUserId, ownerUserId.Value)
            .Where(i => i.Status == RoommateInvitationStatus.ChoPhanHoi)
            .ExecuteUpdateAsync(s => s
                .SetProperty(i => i.Status, RoommateInvitationStatus.DaRut)
                .SetProperty(i => i.RespondedAt, now), cancellationToken);

        _db.RoommateBlocks.Add(new RoommateBlock
        {
            BlockerUserId = blockerUserId,
            BlockedUserId = ownerUserId.Value,
            BlockedAt = now
        });

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    /// <summary>FR-118: các lượt chặn của chính người gọi, mới nhất trước.</summary>
    public async Task<IReadOnlyList<RoommateBlockResponse>> ListBlocksAsync(
        long blockerUserId,
        CancellationToken cancellationToken = default)
        => await _db.RoommateBlocks
            .AsNoTracking()
            .Where(b => b.BlockerUserId == blockerUserId)
            .OrderByDescending(b => b.BlockedAt)
            .ThenByDescending(b => b.Id)
            .Select(b => new RoommateBlockResponse(
                b.Id,
                b.BlockedAt,
                _db.RoommateProfiles
                    .Where(p => p.TenantUserId == b.BlockedUserId)
                    .Select(p => (long?)p.Id)
                    .FirstOrDefault()))
            .ToListAsync(cancellationToken);

    /// <summary>FR-118: bỏ chặn xóa dòng; lời mời đã rút lúc chặn giữ nguyên.</summary>
    public async Task<ServiceResult> UnblockAsync(
        long blockerUserId,
        long blockId,
        CancellationToken cancellationToken = default)
    {
        var deleted = await _db.RoommateBlocks
            .Where(b => b.Id == blockId && b.BlockerUserId == blockerUserId)
            .ExecuteDeleteAsync(cancellationToken);

        return deleted == 0
            ? ServiceResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy lượt chặn.")
            : ServiceResult.Ok();
    }

    /// <summary>
    /// FR-107, FR-113, FR-116, FR-118: xếp hạng ứng viên của người xem. Database lọc hồ sơ Công khai, đang tìm, cùng
    /// tỉnh/thành, của tài khoản không bị khóa và không có hợp đồng Đang hiệu lực; bỏ thêm người có lời mời chặn gửi
    /// lời mời mới và người chặn hoặc bị chặn; <see cref="RoommateMatching.Rank"/> lọc giới tính, tính điểm và lấy 20.
    /// </summary>
    private async Task<ServiceResult<IReadOnlyList<RoommateMatch>>> RankAsync(
        long viewerUserId,
        CancellationToken cancellationToken)
    {
        var viewer = await _db.RoommateProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.TenantUserId == viewerUserId, cancellationToken);

        if (viewer is null)
        {
            return ServiceResult<IReadOnlyList<RoommateMatch>>.Fail(StatusCodes.Status409Conflict, NoProfileMessage);
        }

        if (await HasBlockingContractAsync(viewerUserId, cancellationToken))
        {
            return ServiceResult<IReadOnlyList<RoommateMatch>>.Fail(StatusCodes.Status409Conflict, BlockingContractMessage);
        }

        var invitations = await _db.RoommateInvitations
            .AsNoTracking()
            .Where(i => i.SenderUserId == viewerUserId || i.RecipientUserId == viewerUserId)
            .ToListAsync(cancellationToken);

        var blockedEitherWay = await _db.RoommateBlocks
            .AsNoTracking()
            .Where(b => b.BlockerUserId == viewerUserId || b.BlockedUserId == viewerUserId)
            .Select(b => b.BlockerUserId == viewerUserId ? b.BlockedUserId : b.BlockerUserId)
            .ToListAsync(cancellationToken);

        var hidden = invitations
            .Where(i => i.PreventsNewInvitationFrom(viewerUserId))
            .Select(i => i.OtherPartyOf(viewerUserId))
            .Concat(blockedEitherWay)
            .ToHashSet();

        var candidates = await _db.RoommateProfiles
            .AsNoTracking()
            .Where(p => p.TenantUserId != viewerUserId
                        && p.Visibility == RoommateProfileVisibility.CongKhai
                        && p.IsSearching
                        && p.City == viewer.City
                        && _db.Users.Any(u => u.Id == p.TenantUserId && !u.IsLocked)
                        && !_db.Contracts.Any(c => c.TenantUserId == p.TenantUserId
                                                   && c.Status == RoommateProfile.BlockingContractStatus))
            .ToListAsync(cancellationToken);

        var ranked = RoommateMatching.Rank(viewer, candidates.Where(c => !hidden.Contains(c.TenantUserId)));

        return ServiceResult<IReadOnlyList<RoommateMatch>>.Ok(ranked);
    }

    /// <summary>Từ chối hoặc rút: khóa dòng, kiểm vai (sai vai 404) và trạng thái (không còn chờ 409), rồi chuyển.</summary>
    private async Task<ServiceResult> RespondAsync(
        long invitationId,
        Func<RoommateInvitation, bool> isCallerRole,
        Action<RoommateInvitation, DateTimeOffset> transition,
        CancellationToken cancellationToken)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        await _db.LockRoommateInvitationAsync(invitationId, cancellationToken);

        var invitation = await _db.RoommateInvitations
            .FirstOrDefaultAsync(i => i.Id == invitationId, cancellationToken);

        if (invitation is null || !isCallerRole(invitation))
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, InvitationNotFoundMessage);
        }

        if (!invitation.IsPending)
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, NotPendingMessage);
        }

        transition(invitation, DateTimeOffset.UtcNow);

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    /// <summary>
    /// FR-107, FR-116, FR-120: người gọi phải có hồ sơ và không có hợp đồng Đang hiệu lực — dùng chung cho lời mời và
    /// giải thích điểm. Hợp lệ thì <c>null</c>.
    /// </summary>
    public async Task<ServiceResult?> CheckCallerCanUseAsync(long userId, CancellationToken cancellationToken)
    {
        if (!await _db.RoommateProfiles.AnyAsync(p => p.TenantUserId == userId, cancellationToken))
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, NoProfileMessage);
        }

        return await HasBlockingContractAsync(userId, cancellationToken)
            ? ServiceResult.Fail(StatusCodes.Status409Conflict, BlockingContractMessage)
            : null;
    }

    private IQueryable<RoommateInvitation> BetweenPair(long userIdA, long userIdB)
        => _db.RoommateInvitations.Where(i =>
            (i.SenderUserId == userIdA && i.RecipientUserId == userIdB)
            || (i.SenderUserId == userIdB && i.RecipientUserId == userIdA));

    private Task<bool> IsBlockedEitherWayAsync(long userIdA, long userIdB, CancellationToken cancellationToken)
        => _db.RoommateBlocks.AnyAsync(
            b => (b.BlockerUserId == userIdA && b.BlockedUserId == userIdB)
                 || (b.BlockerUserId == userIdB && b.BlockedUserId == userIdA),
            cancellationToken);

    private Task<bool> HasPhoneNumberAsync(long userId, CancellationToken cancellationToken)
        => _db.Users.AnyAsync(
            u => u.Id == userId && u.PhoneNumber != null && u.PhoneNumber != "",
            cancellationToken);

    /// <summary>FR-107: người dùng đang có hợp đồng Đang hiệu lực.</summary>
    private Task<bool> HasBlockingContractAsync(long userId, CancellationToken cancellationToken)
        => _db.Contracts.AnyAsync(
            c => c.TenantUserId == userId && c.Status == RoommateProfile.BlockingContractStatus,
            cancellationToken);
}
