using Microsoft.EntityFrameworkCore;
using Npgsql;
using SmartRent.Api.Contracts;
using SmartRent.Domain;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Persistence;

namespace SmartRent.Api.Services;

/// <summary>
/// Gửi, duyệt, từ chối, rút và hết hạn yêu cầu thuê — BP-06, FR-25 đến FR-30, FR-36, FR-85, FR-101.
/// </summary>
public class RentalRequestService
{
    /// <summary>Lý do do hệ thống sinh khi tự từ chối các yêu cầu còn lại của phòng (BR-06).</summary>
    private const string RoomTakenReason = "Phòng đã có người thuê khác.";

    private const string ConcurrentChangeMessage =
        "Yêu cầu thuê vừa được thay đổi bởi một thao tác khác. Hãy tải lại và thử lại.";

    private readonly AppDbContext _db;
    private readonly Notifier _notifier;

    public RentalRequestService(AppDbContext db, Notifier notifier)
    {
        _db = db;
        _notifier = notifier;
    }

    /// <summary>FR-25, FR-26, FR-85.</summary>
    public async Task<ServiceResult<RentalRequestDetailResponse>> SubmitAsync(
        long tenantUserId,
        long roomId,
        SubmitRentalRequestRequest request,
        CancellationToken cancellationToken = default)
    {
        // FR-26: phòng không đủ điều kiện BR-05 trả 404 giống chi tiết công khai,
        // để không dò được phòng đang ẩn qua id.
        var room = await _db.Rooms
            .AsNoTracking()
            .Include(r => r.Property)
            .WhereListed(_db.Users)
            .Where(r => r.Id == roomId)
            .FirstOrDefaultAsync(cancellationToken);

        if (room is null)
        {
            return ServiceResult<RentalRequestDetailResponse>.Fail(
                StatusCodes.Status404NotFound, "Không tìm thấy phòng.");
        }

        var now = DateTimeOffset.UtcNow;
        var moveInDate = request.ExpectedMoveInDate!.Value;
        var occupants = request.ExpectedOccupants!.Value;

        if (moveInDate < VietnamTime.DateOf(now))
        {
            return ServiceResult<RentalRequestDetailResponse>.Fail(
                StatusCodes.Status422UnprocessableEntity, "Ngày dự kiến vào ở không được trước hôm nay.");
        }

        // BR-11: vượt số người tối đa thì đằng nào cũng không lập được hợp đồng.
        if (occupants < 1 || occupants > room.MaxOccupants)
        {
            return ServiceResult<RentalRequestDetailResponse>.Fail(
                StatusCodes.Status422UnprocessableEntity,
                $"Số người dự kiến ở phải từ 1 tới {room.MaxOccupants}.");
        }

        var hasPending = await _db.RentalRequests.AnyAsync(
            r => r.RoomId == roomId && r.TenantUserId == tenantUserId && r.Status == RentalRequestStatus.ChoDuyet,
            cancellationToken);

        if (hasPending)
        {
            return PendingRequestExists();
        }

        var rentalRequest = new RentalRequest
        {
            RoomId = roomId,
            TenantUserId = tenantUserId,
            ExpectedMoveInDate = moveInDate,
            ExpectedOccupants = occupants,
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
            Status = RentalRequestStatus.ChoDuyet,
            SubmittedAt = now
        };

        // Lưu yêu cầu trước để có id gắn vào thông báo; hai lần lưu nằm trong một transaction.
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        _db.RentalRequests.Add(rentalRequest);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            // Hai lượt gửi gần như cùng lúc đều qua được bước kiểm tra ở trên;
            // unique index của BR-27 chặn lượt thứ hai.
            return PendingRequestExists();
        }

        _notifier.Notify(
            room.Property.LandlordUserId,
            "YeuCauThueMoi",
            "Có yêu cầu thuê mới",
            $"Có người gửi yêu cầu thuê phòng {room.Code} ({room.Property.Name}). Hãy xử lý trong vòng 7 ngày.",
            nameof(RentalRequest),
            rentalRequest.Id);

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await GetDetailAsync(tenantUserId, rentalRequest.Id, cancellationToken);
    }

    /// <summary>Người thuê thấy yêu cầu của mình; Chủ trọ thấy yêu cầu gửi tới phòng của mình.</summary>
    public async Task<PagedResponse<RentalRequestListItemResponse>> ListAsync(
        long userId,
        bool asLandlord,
        RentalRequestStatus? status,
        long? roomId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _db.RentalRequests.AsNoTracking();

        query = asLandlord
            ? query.Where(r => r.Room.Property.LandlordUserId == userId)
            : query.Where(r => r.TenantUserId == userId);

        if (status is not null)
        {
            query = query.Where(r => r.Status == status);
        }

        // Lọc theo phòng chỉ dành cho Chủ trọ.
        if (asLandlord && roomId is not null)
        {
            query = query.Where(r => r.RoomId == roomId);
        }

        var total = await query.CountAsync(cancellationToken);

        var rows = await query
            .OrderByDescending(r => r.SubmittedAt)
            .ThenByDescending(r => r.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(_db.Users,
                  r => r.TenantUserId,
                  u => u.Id,
                  (r, u) => new
                  {
                      Request = r,
                      RoomCode = r.Room.Code,
                      PropertyName = r.Room.Property.Name,
                      TenantName = u.FullName
                  })
            .ToListAsync(cancellationToken);

        var items = rows
            .Select(row => new RentalRequestListItemResponse(
                row.Request.Id,
                new RoomReferenceResponse(row.Request.RoomId, row.RoomCode, row.PropertyName),
                row.TenantName,
                row.Request.ExpectedMoveInDate,
                row.Request.ExpectedOccupants,
                row.Request.Status,
                row.Request.SubmittedAt,
                ExpiresAt(row.Request),
                HoldExpiresAt(row.Request)))
            .ToList();

        return new PagedResponse<RentalRequestListItemResponse>(
            items, page, pageSize, total, (int)Math.Ceiling(total / (double)pageSize));
    }

    /// <summary>Chỉ người gửi và Chủ trọ sở hữu phòng xem được; người khác nhận 404.</summary>
    public async Task<ServiceResult<RentalRequestDetailResponse>> GetDetailAsync(
        long userId,
        long id,
        CancellationToken cancellationToken = default)
    {
        var row = await _db.RentalRequests
            .AsNoTracking()
            .Where(r => r.Id == id)
            .Select(r => new
            {
                Request = r,
                RoomCode = r.Room.Code,
                PropertyName = r.Room.Property.Name,
                r.Room.Property.LandlordUserId
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (row is null || (row.Request.TenantUserId != userId && row.LandlordUserId != userId))
        {
            return NotFound<RentalRequestDetailResponse>();
        }

        var r = row.Request;

        var people = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == r.TenantUserId || u.Id == row.LandlordUserId)
            .Select(u => new { u.Id, u.FullName, u.PhoneNumber })
            .ToListAsync(cancellationToken);

        var tenant = people.Single(p => p.Id == r.TenantUserId);
        var landlord = people.Single(p => p.Id == row.LandlordUserId);

        long? contractId = r.Status == RentalRequestStatus.DaLapHopDong
            ? await _db.Contracts
                .Where(c => c.RentalRequestId == r.Id)
                .Select(c => (long?)c.Id)
                .FirstOrDefaultAsync(cancellationToken)
            : null;

        // QR-07: số điện thoại bên còn lại chỉ lộ khi Chủ trọ đã duyệt và còn hạn giữ chỗ, kể cả khi tác vụ
        // định kỳ chưa chuyển yêu cầu sang Hết hạn. Sau khi lập hợp đồng, số điện thoại hai bên nằm ở chi tiết hợp đồng.
        string? otherPartyPhoneNumber = r.IsHoldingRoom(DateTimeOffset.UtcNow)
            ? (userId == r.TenantUserId ? landlord.PhoneNumber : tenant.PhoneNumber)
            : null;

        return ServiceResult<RentalRequestDetailResponse>.Ok(new RentalRequestDetailResponse(
            r.Id,
            new RoomReferenceResponse(r.RoomId, row.RoomCode, row.PropertyName),
            tenant.FullName,
            r.ExpectedMoveInDate,
            r.ExpectedOccupants,
            r.Status,
            r.SubmittedAt,
            ExpiresAt(r),
            HoldExpiresAt(r),
            r.Note,
            r.ProcessedAt,
            r.RejectReason,
            contractId,
            otherPartyPhoneNumber));
    }

    /// <summary>
    /// FR-30, FR-101: duyệt thì cùng lúc giữ chỗ phòng và tự từ chối mọi yêu cầu khác đang chờ của phòng (BR-06).
    /// Mọi thay đổi nằm trong một lần lưu nên chạy trong một transaction.
    /// </summary>
    public async Task<ServiceResult> ApproveAsync(
        long landlordUserId,
        long id,
        CancellationToken cancellationToken = default)
    {
        var request = await FindAsync(id, cancellationToken);

        if (request is null || request.Room.Property.LandlordUserId != landlordUserId)
        {
            return NotFound();
        }

        var now = DateTimeOffset.UtcNow;

        if (!request.IsAwaitingReview(now))
        {
            return ServiceResult.Fail(
                StatusCodes.Status409Conflict, "Yêu cầu thuê không còn chờ duyệt hoặc đã quá hạn xử lý 7 ngày.");
        }

        if (request.Room.OccupancyStatus != RoomOccupancyStatus.Trong)
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, "Phòng không còn ở trạng thái Trống.");
        }

        var approvedBefore = now - RentalRequest.HoldWindow;

        // Hết hạn giữ chỗ được tính ngay, không chờ tác vụ định kỳ (architecture mục 7): yêu cầu đã duyệt khác
        // của người thuê mà quá 72 giờ thì chuyển Hết hạn như ExpireHeldAsync. Lưu trước lượt duyệt để unique
        // index BR-28 không thấy hai yêu cầu DaDuyet cùng lúc; hai lần lưu nằm trong một transaction.
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        var expiredHolds = await _db.RentalRequests
            .Include(r => r.Room)
            .ThenInclude(room => room.Property)
            .Where(r => r.TenantUserId == request.TenantUserId
                        && r.Status == RentalRequestStatus.DaDuyet
                        && r.ProcessedAt < approvedBefore)
            .ToListAsync(cancellationToken);

        if (expiredHolds.Count > 0)
        {
            foreach (var expiredHold in expiredHolds)
            {
                ExpireHeld(expiredHold);
            }

            var expiredSaved = await SaveAsync(cancellationToken);

            if (!expiredSaved.Succeeded)
            {
                return expiredSaved;
            }
        }

        // BR-28: người thuê đang giữ phòng khác — yêu cầu khác đã duyệt, hoặc hợp đồng chưa có hiệu lực
        // còn trong hạn giữ chỗ (cùng điều kiện với Contract.IsHoldExpired).
        var tenantIsHoldingRoom =
            await _db.RentalRequests.AnyAsync(
                r => r.TenantUserId == request.TenantUserId && r.Status == RentalRequestStatus.DaDuyet,
                cancellationToken)
            || await _db.Contracts.AnyAsync(
                c => c.TenantUserId == request.TenantUserId
                     && Contract.AwaitingActivationStatuses.Contains(c.Status)
                     && (c.RentalRequest == null || c.RentalRequest.ProcessedAt >= approvedBefore),
                cancellationToken);

        if (tenantIsHoldingRoom)
        {
            return TenantHoldingAnotherRoom();
        }

        request.Status = RentalRequestStatus.DaDuyet;
        request.ProcessedAt = now;
        request.Room.OccupancyStatus = RoomOccupancyStatus.DangGiuCho;

        _notifier.Notify(
            request.TenantUserId,
            "YeuCauThueDuocDuyet",
            "Yêu cầu thuê được duyệt",
            $"Chủ trọ đã duyệt yêu cầu thuê phòng {request.Room.Code} ({request.Room.Property.Name}). " +
            "Phòng được giữ cho bạn trong 72 giờ để hoàn tất hợp đồng và tiền cọc.",
            nameof(RentalRequest),
            request.Id);

        // BR-06
        var others = await _db.RentalRequests
            .Where(r => r.RoomId == request.RoomId
                        && r.Id != request.Id
                        && r.Status == RentalRequestStatus.ChoDuyet)
            .ToListAsync(cancellationToken);

        foreach (var other in others)
        {
            other.Status = RentalRequestStatus.TuChoi;
            other.RejectReason = RoomTakenReason;
            other.ProcessedAt = now;

            _notifier.Notify(
                other.TenantUserId,
                "YeuCauThueBiTuChoi",
                "Yêu cầu thuê bị từ chối",
                $"Yêu cầu thuê phòng {request.Room.Code} ({request.Room.Property.Name}) bị từ chối. Lý do: {RoomTakenReason}",
                nameof(RentalRequest),
                other.Id);
        }

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, ConcurrentChangeMessage);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            // Hai Chủ trọ duyệt hai yêu cầu của cùng một người thuê gần như cùng lúc;
            // unique index của BR-28 chặn lượt thứ hai.
            return TenantHoldingAnotherRoom();
        }

        await transaction.CommitAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    /// <summary>
    /// FR-29: từ chối yêu cầu đang chờ, hoặc hủy duyệt yêu cầu đã duyệt mà chưa lập hợp đồng (BP-06 A5) —
    /// khi đó phòng trở lại Trống ngay.
    /// </summary>
    public async Task<ServiceResult> RejectAsync(
        long landlordUserId,
        long id,
        string reason,
        CancellationToken cancellationToken = default)
    {
        var request = await FindAsync(id, cancellationToken);

        if (request is null || request.Room.Property.LandlordUserId != landlordUserId)
        {
            return NotFound();
        }

        var now = DateTimeOffset.UtcNow;
        var isUnapproving = request.IsHoldingRoom(now);

        if (!request.IsAwaitingReview(now) && !isUnapproving)
        {
            return ServiceResult.Fail(
                StatusCodes.Status409Conflict,
                "Chỉ từ chối được yêu cầu đang chờ duyệt, hoặc hủy duyệt yêu cầu đã duyệt mà chưa lập hợp đồng và còn hạn giữ chỗ.");
        }

        reason = reason.Trim();

        request.Status = RentalRequestStatus.TuChoi;
        request.RejectReason = reason;
        request.ProcessedAt = now;

        if (isUnapproving)
        {
            ReleaseHeldRoom(request.Room);
        }

        _notifier.Notify(
            request.TenantUserId,
            "YeuCauThueBiTuChoi",
            "Yêu cầu thuê bị từ chối",
            (isUnapproving
                ? $"Chủ trọ đã hủy duyệt yêu cầu thuê phòng {request.Room.Code} ({request.Room.Property.Name})."
                : $"Chủ trọ đã từ chối yêu cầu thuê phòng {request.Room.Code} ({request.Room.Property.Name}).")
            + $" Lý do: {reason}",
            nameof(RentalRequest),
            request.Id);

        return await SaveAsync(cancellationToken);
    }

    /// <summary>
    /// FR-27: người thuê rút yêu cầu chưa được xử lý, hoặc đã duyệt mà chưa lập hợp đồng —
    /// khi đó phòng trở lại Trống ngay và Chủ trọ nhận thông báo.
    /// </summary>
    public async Task<ServiceResult> CancelAsync(
        long tenantUserId,
        long id,
        CancellationToken cancellationToken = default)
    {
        var request = await FindAsync(id, cancellationToken);

        if (request is null || request.TenantUserId != tenantUserId)
        {
            return NotFound();
        }

        var now = DateTimeOffset.UtcNow;
        var wasHoldingRoom = request.IsHoldingRoom(now);

        if (!request.IsAwaitingReview(now) && !wasHoldingRoom)
        {
            return ServiceResult.Fail(
                StatusCodes.Status409Conflict,
                "Chỉ rút được yêu cầu đang chờ duyệt, hoặc đã duyệt mà chưa lập hợp đồng và còn hạn giữ chỗ.");
        }

        request.Status = RentalRequestStatus.DaHuy;

        if (wasHoldingRoom)
        {
            ReleaseHeldRoom(request.Room);

            _notifier.Notify(
                request.Room.Property.LandlordUserId,
                "YeuCauThueBiRut",
                "Người thuê rút yêu cầu thuê",
                $"Người thuê đã rút yêu cầu thuê phòng {request.Room.Code} ({request.Room.Property.Name}). " +
                "Phòng đã trở lại trạng thái Trống.",
                nameof(RentalRequest),
                request.Id);
        }

        return await SaveAsync(cancellationToken);
    }

    /// <summary>
    /// Tác vụ định kỳ — FR-28: yêu cầu chờ duyệt quá 168 giờ chuyển sang Hết hạn. Phòng chưa bị giữ chỗ nên không đổi.
    /// </summary>
    /// <returns>Số yêu cầu đã chuyển.</returns>
    public async Task<int> ExpireUnreviewedAsync(DateTimeOffset now, CancellationToken cancellationToken = default)
    {
        var submittedBefore = now - RentalRequest.ReviewWindow;

        var ids = await _db.RentalRequests
            .Where(r => r.Status == RentalRequestStatus.ChoDuyet && r.SubmittedAt < submittedBefore)
            .Select(r => r.Id)
            .ToListAsync(cancellationToken);

        var expired = 0;

        foreach (var id in ids)
        {
            // Xử lý từng yêu cầu: một yêu cầu vừa bị người dùng thao tác cùng lúc không làm hỏng cả lượt chạy.
            _db.ChangeTracker.Clear();

            var request = await FindAsync(id, cancellationToken);

            if (request is null || request.Status != RentalRequestStatus.ChoDuyet || request.IsAwaitingReview(now))
            {
                continue;
            }

            request.Status = RentalRequestStatus.HetHan;

            _notifier.Notify(
                request.TenantUserId,
                "YeuCauThueHetHan",
                "Yêu cầu thuê đã hết hạn",
                $"Yêu cầu thuê phòng {request.Room.Code} ({request.Room.Property.Name}) đã hết hạn vì Chủ trọ " +
                "không xử lý trong 7 ngày.",
                nameof(RentalRequest),
                request.Id);

            if ((await SaveAsync(cancellationToken)).Succeeded)
            {
                expired++;
            }
        }

        return expired;
    }

    /// <summary>
    /// Tác vụ định kỳ — FR-36: yêu cầu đã duyệt quá 72 giờ mà chưa lập hợp đồng chuyển sang Hết hạn,
    /// phòng trở lại Trống, hai bên nhận thông báo. Hợp đồng đã lập mà hết hạn giữ chỗ do ContractService xử lý.
    /// </summary>
    /// <returns>Số yêu cầu đã chuyển.</returns>
    public async Task<int> ExpireHeldAsync(DateTimeOffset now, CancellationToken cancellationToken = default)
    {
        var approvedBefore = now - RentalRequest.HoldWindow;

        var ids = await _db.RentalRequests
            .Where(r => r.Status == RentalRequestStatus.DaDuyet && r.ProcessedAt < approvedBefore)
            .Select(r => r.Id)
            .ToListAsync(cancellationToken);

        var expired = 0;

        foreach (var id in ids)
        {
            _db.ChangeTracker.Clear();

            var request = await FindAsync(id, cancellationToken);

            if (request is null || request.Status != RentalRequestStatus.DaDuyet || request.IsHoldingRoom(now))
            {
                continue;
            }

            ExpireHeld(request);

            if ((await SaveAsync(cancellationToken)).Succeeded)
            {
                expired++;
            }
        }

        return expired;
    }

    /// <summary>
    /// FR-36: yêu cầu đã duyệt quá 72 giờ mà chưa lập hợp đồng chuyển Hết hạn, phòng trở lại Trống,
    /// hai bên nhận thông báo. Cần nạp sẵn Room và Property.
    /// </summary>
    private void ExpireHeld(RentalRequest request)
    {
        request.Status = RentalRequestStatus.HetHan;
        ReleaseHeldRoom(request.Room);

        var content = $"Đã hết hạn giữ chỗ 72 giờ cho phòng {request.Room.Code} ({request.Room.Property.Name}) " +
                      "mà hợp đồng chưa được lập. Yêu cầu thuê đã hết hạn và phòng trở lại trạng thái Trống.";

        foreach (var recipient in new[] { request.TenantUserId, request.Room.Property.LandlordUserId })
        {
            _notifier.Notify(
                recipient,
                "YeuCauThueHetHan",
                "Yêu cầu thuê đã hết hạn giữ chỗ",
                content,
                nameof(RentalRequest),
                request.Id);
        }
    }

    private Task<RentalRequest?> FindAsync(long id, CancellationToken cancellationToken)
        => _db.RentalRequests
            .Include(r => r.Room)
            .ThenInclude(room => room.Property)
            .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);

    /// <summary>Phòng đang giữ chỗ cho yêu cầu này trở lại Trống và hiển thị lại theo BR-05.</summary>
    private static void ReleaseHeldRoom(Room room)
    {
        if (room.OccupancyStatus == RoomOccupancyStatus.DangGiuCho)
        {
            room.OccupancyStatus = RoomOccupancyStatus.Trong;
        }
    }

    /// <summary>Thao tác khác vừa đổi cùng yêu cầu thì trả 409 thay vì ghi đè.</summary>
    private async Task<ServiceResult> SaveAsync(CancellationToken cancellationToken)
    {
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
            return ServiceResult.Ok();
        }
        catch (DbUpdateConcurrencyException)
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, ConcurrentChangeMessage);
        }
    }

    private static DateTimeOffset? ExpiresAt(RentalRequest r)
        => r.Status == RentalRequestStatus.ChoDuyet ? r.ReviewDeadline : null;

    private static DateTimeOffset? HoldExpiresAt(RentalRequest r)
        => r.Status == RentalRequestStatus.DaDuyet ? r.HoldDeadline : null;

    private static bool IsUniqueViolation(DbUpdateException ex)
        => ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };

    private static ServiceResult NotFound()
        => ServiceResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy yêu cầu thuê.");

    private static ServiceResult<T> NotFound<T>()
        => ServiceResult<T>.Fail(StatusCodes.Status404NotFound, "Không tìm thấy yêu cầu thuê.");

    private static ServiceResult<RentalRequestDetailResponse> PendingRequestExists()
        => ServiceResult<RentalRequestDetailResponse>.Fail(
            StatusCodes.Status409Conflict, "Bạn đã có một yêu cầu thuê đang chờ duyệt cho phòng này.");

    private static ServiceResult TenantHoldingAnotherRoom()
        => ServiceResult.Fail(
            StatusCodes.Status409Conflict,
            "Người thuê đang giữ một phòng khác — có yêu cầu thuê đã duyệt hoặc hợp đồng chưa có hiệu lực.");
}
