using Microsoft.EntityFrameworkCore;
using Npgsql;
using SmartRent.Api.Contracts;
using SmartRent.Domain;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Persistence;

namespace SmartRent.Api.Services;

/// <summary>
/// Lập hợp đồng, xác nhận điều khoản, xác nhận cọc, kích hoạt, hủy trước ngày bắt đầu, ghi nhận hoàn cọc khi hủy
/// và hạn giữ chỗ — BP-06, FR-31 đến FR-37, FR-76, FR-79, FR-84, FR-86, FR-90, FR-94, FR-102.
/// </summary>
public class ContractService
{
    /// <summary>Nhắc khi hạn giữ chỗ còn dưới 24 giờ (FR-94).</summary>
    private static readonly TimeSpan HoldReminderLead = TimeSpan.FromHours(24);

    private const string HoldExpiredMessage =
        "Đã hết hạn giữ chỗ 72 giờ kể từ khi duyệt yêu cầu thuê. Hợp đồng chưa có hiệu lực sẽ bị hủy.";

    private const string ConcurrentChangeMessage =
        "Hợp đồng vừa được thay đổi bởi một thao tác khác. Hãy tải lại và thử lại.";

    private const string RoomOccupiedMessage = "Phòng đang có một hợp đồng hiệu lực khác.";

    private readonly AppDbContext _db;
    private readonly AuditLogger _auditLogger;
    private readonly Notifier _notifier;

    public ContractService(AppDbContext db, AuditLogger auditLogger, Notifier notifier)
    {
        _db = db;
        _auditLogger = auditLogger;
        _notifier = notifier;
    }

    /// <summary>FR-31, FR-33, FR-90: lập hợp đồng nháp từ một yêu cầu thuê đã duyệt, chốt cứng điều khoản (BR-12).</summary>
    public async Task<ServiceResult<ContractDetailResponse>> CreateAsync(
        long landlordUserId,
        CreateContractRequest request,
        CancellationToken cancellationToken = default)
    {
        var rentalRequest = await _db.RentalRequests
            .Include(r => r.Room)
            .ThenInclude(room => room.Property)
            .FirstOrDefaultAsync(r => r.Id == request.RentalRequestId!.Value, cancellationToken);

        if (rentalRequest is null || rentalRequest.Room.Property.LandlordUserId != landlordUserId)
        {
            return ServiceResult<ContractDetailResponse>.Fail(
                StatusCodes.Status404NotFound, "Không tìm thấy yêu cầu thuê.");
        }

        var now = DateTimeOffset.UtcNow;

        if (rentalRequest.Status != RentalRequestStatus.DaDuyet)
        {
            return ServiceResult<ContractDetailResponse>.Fail(
                StatusCodes.Status409Conflict, "Chỉ lập được hợp đồng từ yêu cầu thuê đã duyệt.");
        }

        if (!rentalRequest.IsHoldingRoom(now))
        {
            return ServiceResult<ContractDetailResponse>.Fail(StatusCodes.Status409Conflict, HoldExpiredMessage);
        }

        if (ValidateTerms(request, rentalRequest.Room, now) is { } termsError)
        {
            return ServiceResult<ContractDetailResponse>.Fail(StatusCodes.Status422UnprocessableEntity, termsError);
        }

        // BR-07
        var roomOccupied = await _db.Contracts.AnyAsync(
            c => c.RoomId == rentalRequest.RoomId && Contract.OccupyingStatuses.Contains(c.Status),
            cancellationToken);

        if (roomOccupied)
        {
            return ServiceResult<ContractDetailResponse>.Fail(StatusCodes.Status409Conflict, RoomOccupiedMessage);
        }

        var contract = new Contract
        {
            RoomId = rentalRequest.RoomId,
            TenantUserId = rentalRequest.TenantUserId,
            RentalRequestId = rentalRequest.Id,
            Status = ContractStatus.Nhap
        };

        ApplyTerms(contract, request);
        _db.Contracts.Add(contract);

        // Yêu cầu thuê giữ trạng thái này kể cả khi hợp đồng bị hủy sau đó.
        rentalRequest.Status = RentalRequestStatus.DaLapHopDong;

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Hai lượt lập hợp đồng từ cùng một yêu cầu, hoặc người thuê vừa rút yêu cầu.
            return ServiceResult<ContractDetailResponse>.Fail(
                StatusCodes.Status409Conflict,
                "Yêu cầu thuê vừa được thay đổi bởi một thao tác khác. Hãy tải lại và thử lại.");
        }

        return await GetDetailAsync(landlordUserId, contract.Id, cancellationToken);
    }

    /// <summary>Sửa khi còn ở Nháp; điều khoản, phí dịch vụ và người ở cùng được thay nguyên.</summary>
    public async Task<ServiceResult<ContractDetailResponse>> UpdateAsync(
        long landlordUserId,
        long id,
        UpdateContractRequest request,
        CancellationToken cancellationToken = default)
    {
        var contract = await _db.Contracts
            .Include(c => c.Room)
            .ThenInclude(r => r.Property)
            .Include(c => c.RentalRequest)
            .Include(c => c.ServiceFees)
            .Include(c => c.Occupants)
            .AsSplitQuery()
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (contract is null || !IsLandlordOf(contract, landlordUserId))
        {
            return NotFound<ContractDetailResponse>();
        }

        var now = DateTimeOffset.UtcNow;

        if (contract.Status != ContractStatus.Nhap)
        {
            return ServiceResult<ContractDetailResponse>.Fail(
                StatusCodes.Status409Conflict, "Chỉ sửa được hợp đồng ở trạng thái Nháp.");
        }

        if (contract.IsHoldExpired(now))
        {
            return ServiceResult<ContractDetailResponse>.Fail(StatusCodes.Status409Conflict, HoldExpiredMessage);
        }

        if (ValidateTerms(request, contract.Room, now) is { } termsError)
        {
            return ServiceResult<ContractDetailResponse>.Fail(StatusCodes.Status422UnprocessableEntity, termsError);
        }

        ApplyTerms(contract, request);

        var saved = await SaveAsync(cancellationToken);

        return saved.Succeeded
            ? await GetDetailAsync(landlordUserId, contract.Id, cancellationToken)
            : ServiceResult<ContractDetailResponse>.Fail(saved.StatusCode, saved.Error!);
    }

    /// <summary>Gửi hợp đồng nháp cho người thuê xác nhận.</summary>
    public async Task<ServiceResult> SendAsync(
        long landlordUserId,
        long id,
        CancellationToken cancellationToken = default)
    {
        var contract = await FindAsync(id, cancellationToken);

        if (contract is null || !IsLandlordOf(contract, landlordUserId))
        {
            return NotFound();
        }

        var now = DateTimeOffset.UtcNow;

        if (contract.Status != ContractStatus.Nhap)
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, "Chỉ gửi được hợp đồng ở trạng thái Nháp.");
        }

        if (contract.IsHoldExpired(now))
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, HoldExpiredMessage);
        }

        contract.Status = ContractStatus.ChoNguoiThueXacNhan;

        _notifier.Notify(
            contract.TenantUserId,
            "HopDongChoXacNhan",
            "Hợp đồng chờ bạn xác nhận",
            $"Chủ trọ đã gửi hợp đồng thuê phòng {RoomLabel(contract)}. " +
            "Hãy xem lại điều khoản và xác nhận trước khi hết hạn giữ chỗ.",
            nameof(Contract),
            contract.Id);

        return await SaveAsync(cancellationToken);
    }

    /// <summary>FR-102: thu hồi hợp đồng đã gửi về Nháp để sửa; người thuê phải xác nhận lại. Hạn giữ chỗ không đổi.</summary>
    public async Task<ServiceResult> RecallAsync(
        long landlordUserId,
        long id,
        CancellationToken cancellationToken = default)
    {
        var contract = await FindAsync(id, cancellationToken);

        if (contract is null || !IsLandlordOf(contract, landlordUserId))
        {
            return NotFound();
        }

        var now = DateTimeOffset.UtcNow;

        if (!contract.CanRecall(now))
        {
            return Conflict(contract, now,
                "Chỉ thu hồi được hợp đồng đang chờ người thuê xác nhận hoặc chờ nhận cọc.");
        }

        contract.Recall(now);

        _notifier.Notify(
            contract.TenantUserId,
            "HopDongBiThuHoi",
            "Hợp đồng được thu hồi để sửa",
            $"Chủ trọ đã thu hồi hợp đồng thuê phòng {RoomLabel(contract)} để sửa. " +
            "Bạn sẽ cần xác nhận lại khi hợp đồng được gửi lại.",
            nameof(Contract),
            contract.Id);

        return await SaveAsync(cancellationToken);
    }

    /// <summary>FR-34: người thuê đồng ý điều khoản. Tiền cọc bằng 0 thì hợp đồng có hiệu lực ngay (BR-21).</summary>
    public async Task<ServiceResult> ConfirmAsync(
        long tenantUserId,
        long id,
        CancellationToken cancellationToken = default)
    {
        var contract = await FindAsync(id, cancellationToken);

        if (contract is null || contract.TenantUserId != tenantUserId)
        {
            return NotFound();
        }

        var now = DateTimeOffset.UtcNow;

        if (!contract.CanConfirmByTenant(now))
        {
            return Conflict(contract, now, "Hợp đồng không ở trạng thái chờ bạn xác nhận.");
        }

        if (contract.ConfirmByTenant(now))
        {
            OnActivated(contract);
        }

        return await SaveActivationAsync(cancellationToken);
    }

    /// <summary>FR-84: người thuê yêu cầu chỉnh sửa; hợp đồng về Nháp và Chủ trọ nhận lý do.</summary>
    public async Task<ServiceResult> RequestChangesAsync(
        long tenantUserId,
        long id,
        string reason,
        CancellationToken cancellationToken = default)
    {
        var contract = await FindAsync(id, cancellationToken);

        if (contract is null || contract.TenantUserId != tenantUserId)
        {
            return NotFound();
        }

        var now = DateTimeOffset.UtcNow;

        if (contract.Status != ContractStatus.ChoNguoiThueXacNhan)
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, "Hợp đồng không ở trạng thái chờ bạn xác nhận.");
        }

        if (contract.IsHoldExpired(now))
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, HoldExpiredMessage);
        }

        contract.Status = ContractStatus.Nhap;

        _notifier.Notify(
            contract.Room.Property.LandlordUserId,
            "HopDongCanChinhSua",
            "Người thuê yêu cầu chỉnh sửa hợp đồng",
            $"Người thuê yêu cầu chỉnh sửa hợp đồng thuê phòng {RoomLabel(contract)}. Lý do: {reason.Trim()}",
            nameof(Contract),
            contract.Id);

        return await SaveAsync(cancellationToken);
    }

    /// <summary>FR-34: Chủ trọ xác nhận đã nhận cọc sau khi người thuê đồng ý; hợp đồng có hiệu lực (BR-21).</summary>
    public async Task<ServiceResult> ConfirmDepositAsync(
        long landlordUserId,
        long id,
        ConfirmDepositRequest request,
        CancellationToken cancellationToken = default)
    {
        var contract = await FindAsync(id, cancellationToken);

        if (contract is null || !IsLandlordOf(contract, landlordUserId))
        {
            return NotFound();
        }

        var now = DateTimeOffset.UtcNow;

        if (!contract.CanConfirmDeposit(now))
        {
            return Conflict(contract, now, "Hợp đồng không ở trạng thái chờ nhận cọc.");
        }

        // Client gửi giờ Việt Nam (+07:00) hoặc không kèm offset; Npgsql chỉ ghi được DateTimeOffset ở UTC vào timestamptz.
        var receivedAt = request.ReceivedAt!.Value.ToUniversalTime();
        var method = request.Method!.Value;

        if (receivedAt > now)
        {
            return ServiceResult.Fail(
                StatusCodes.Status422UnprocessableEntity, "Thời điểm nhận cọc không được sau thời điểm hiện tại.");
        }

        var previousStatus = contract.Status;
        contract.ConfirmDeposit(receivedAt, method, now);

        // BR-23
        _auditLogger.Write(
            landlordUserId,
            "XacNhanNhanCoc",
            nameof(Contract),
            contract.Id,
            new { Status = previousStatus.ToString() },
            new
            {
                Status = contract.Status.ToString(),
                contract.DepositAmount,
                DepositReceivedAt = receivedAt,
                DepositReceivedMethod = method.ToString()
            });

        OnActivated(contract);

        return await SaveActivationAsync(cancellationToken);
    }

    /// <summary>
    /// FR-76: một trong hai bên hủy hợp đồng chưa tới ngày bắt đầu; phòng trở lại Trống ngay.
    /// Không lập hóa đơn thanh lý — tiền cọc đã nhận được hoàn ở bước ghi nhận hoàn cọc (BR-22).
    /// </summary>
    public async Task<ServiceResult> CancelAsync(
        long userId,
        long id,
        string reason,
        CancellationToken cancellationToken = default)
    {
        var contract = await FindAsync(id, cancellationToken);

        if (contract is null)
        {
            return NotFound();
        }

        var landlordUserId = contract.Room.Property.LandlordUserId;

        if (userId != landlordUserId && userId != contract.TenantUserId)
        {
            return NotFound();
        }

        var now = DateTimeOffset.UtcNow;

        if (!contract.CanBeCancelled(VietnamTime.DateOf(now)))
        {
            return ServiceResult.Fail(
                StatusCodes.Status409Conflict,
                "Chỉ hủy được hợp đồng chưa tới ngày bắt đầu. Hợp đồng đã bắt đầu phải kết thúc theo luồng thanh lý.");
        }

        reason = reason.Trim();
        contract.Cancel(userId, reason, now);
        ReleaseRoom(contract.Room);

        var otherParty = userId == landlordUserId ? contract.TenantUserId : landlordUserId;
        var cancelledBy = userId == landlordUserId ? "Chủ trọ" : "Người thuê";

        _notifier.Notify(
            otherParty,
            "HopDongBiHuy",
            "Hợp đồng bị hủy",
            $"{cancelledBy} đã hủy hợp đồng thuê phòng {RoomLabel(contract)}. Lý do: {reason}",
            nameof(Contract),
            contract.Id);

        return await SaveAsync(cancellationToken);
    }

    /// <summary>
    /// FR-86: Chủ trọ ghi nhận đã hoàn cọc cho hợp đồng đã hủy. Chủ trọ hủy thì hoàn toàn bộ cọc;
    /// Người thuê hủy thì Chủ trọ nhập số hoàn từ 0 tới tiền cọc, kèm lý do khi giữ lại một phần (BR-22).
    /// </summary>
    public async Task<ServiceResult> RefundDepositAsync(
        long landlordUserId,
        long id,
        RefundDepositRequest request,
        CancellationToken cancellationToken = default)
    {
        var contract = await FindAsync(id, cancellationToken);

        if (contract is null || !IsLandlordOf(contract, landlordUserId))
        {
            return NotFound();
        }

        if (!contract.IsAwaitingDepositRefund)
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, "Hợp đồng không có khoản cọc đang chờ hoàn.");
        }

        // Đổi sang UTC như thời điểm nhận cọc; hoàn cọc chỉ xảy ra sau khi hủy và không ở tương lai.
        var refundedAt = request.RefundedAt!.Value.ToUniversalTime();

        if (refundedAt < contract.CancelledAt || refundedAt > DateTimeOffset.UtcNow)
        {
            return ServiceResult.Fail(
                StatusCodes.Status422UnprocessableEntity,
                "Thời điểm hoàn cọc phải từ lúc hợp đồng bị hủy tới thời điểm hiện tại.");
        }

        decimal amount;
        string? note = null;

        if (contract.WasCancelledByTenant)
        {
            if (request.Amount is not { } requested || requested < 0 || requested > contract.DepositAmount)
            {
                return ServiceResult.Fail(
                    StatusCodes.Status422UnprocessableEntity, "Số tiền hoàn phải từ 0 tới số tiền cọc của hợp đồng.");
            }

            note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();

            if (requested < contract.DepositAmount && note is null)
            {
                return ServiceResult.Fail(
                    StatusCodes.Status422UnprocessableEntity, "Phải ghi lý do khi giữ lại một phần tiền cọc.");
            }

            amount = requested;
        }
        else
        {
            // Chủ trọ hủy: số hoàn do server đặt bằng toàn bộ cọc, bỏ qua số tiền client gửi lên.
            amount = contract.DepositAmount;
        }

        contract.DepositRefundedAmount = amount;
        contract.DepositRefundedAt = refundedAt;
        contract.DepositRefundMethod = request.RefundMethod!.Value;
        contract.DepositRefundNote = note;

        // BR-23
        _auditLogger.Write(
            landlordUserId,
            "GhiNhanHoanCoc",
            nameof(Contract),
            contract.Id,
            new { contract.DepositAmount, CancelledBy = contract.WasCancelledByTenant ? "Tenant" : "Landlord" },
            new
            {
                DepositRefundedAmount = amount,
                DepositRefundedAt = contract.DepositRefundedAt,
                DepositRefundMethod = contract.DepositRefundMethod.ToString(),
                DepositRefundNote = note
            });

        _notifier.Notify(
            contract.TenantUserId,
            "HoanCocDuocGhiNhan",
            "Chủ trọ đã ghi nhận hoàn cọc",
            $"Chủ trọ đã ghi nhận hoàn cọc cho hợp đồng thuê phòng {RoomLabel(contract)}. " +
            "Hãy xem chi tiết số tiền hoàn trên hợp đồng.",
            nameof(Contract),
            contract.Id);

        return await SaveAsync(cancellationToken);
    }

    /// <summary>
    /// FR-90: chỉ số cuối đã ghi nhận của phòng, để điền sẵn chỉ số đầu khi lập hợp đồng — chỉ số mới của
    /// hóa đơn chưa hủy gần nhất của hợp đồng gần nhất, hoặc chỉ số đầu của hợp đồng đó nếu chưa có hóa đơn.
    /// Phòng chưa từng có hợp đồng thì trả về null.
    /// </summary>
    public async Task<ServiceResult<MeterReadingsResponse?>> GetLatestMeterReadingsAsync(
        long landlordUserId,
        long roomId,
        CancellationToken cancellationToken = default)
    {
        var ownsRoom = await _db.Rooms.AnyAsync(
            r => r.Id == roomId && r.Property.LandlordUserId == landlordUserId,
            cancellationToken);

        if (!ownsRoom)
        {
            return ServiceResult<MeterReadingsResponse?>.Fail(StatusCodes.Status404NotFound, "Không tìm thấy phòng.");
        }

        var latest = await _db.Contracts
            .AsNoTracking()
            .Where(c => c.RoomId == roomId)
            .OrderByDescending(c => c.Id)
            .Select(c => new
            {
                c.InitialElectricityIndex,
                c.InitialWaterIndex,
                LatestInvoice = c.Invoices
                    .Where(i => i.Status != InvoiceStatus.DaHuy)
                    .OrderByDescending(i => i.PeriodEnd)
                    .ThenByDescending(i => i.Id)
                    .Select(i => new { i.CurrentElectricityIndex, i.CurrentWaterIndex })
                    .FirstOrDefault()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (latest is null)
        {
            return ServiceResult<MeterReadingsResponse?>.Ok(null);
        }

        return ServiceResult<MeterReadingsResponse?>.Ok(latest.LatestInvoice is { } invoice
            ? new MeterReadingsResponse(invoice.CurrentElectricityIndex, invoice.CurrentWaterIndex)
            : new MeterReadingsResponse(latest.InitialElectricityIndex, latest.InitialWaterIndex));
    }

    /// <summary>
    /// FR-90: sửa chỉ số đầu khi hợp đồng đã hiệu lực mà chưa có hóa đơn nào khác Đã hủy —
    /// số thực tế lúc bàn giao khác số đã ghi. Ghi nhật ký (BR-23) và thông báo cho người thuê.
    /// </summary>
    public async Task<ServiceResult> UpdateInitialMeterReadingsAsync(
        long landlordUserId,
        long id,
        InitialMeterReadingsRequest request,
        CancellationToken cancellationToken = default)
    {
        var contract = await FindAsync(id, cancellationToken);

        if (contract is null || !IsLandlordOf(contract, landlordUserId))
        {
            return NotFound();
        }

        var hasInvoice = await _db.Invoices.AnyAsync(
            i => i.ContractId == id && i.Status != InvoiceStatus.DaHuy,
            cancellationToken);

        if (contract.Status != ContractStatus.DangHieuLuc || hasInvoice)
        {
            return ServiceResult.Fail(
                StatusCodes.Status409Conflict,
                "Chỉ sửa được chỉ số đầu khi hợp đồng đang hiệu lực và chưa có hóa đơn nào.");
        }

        var previous = new { contract.InitialElectricityIndex, contract.InitialWaterIndex };

        contract.InitialElectricityIndex = request.InitialElectricityIndex!.Value;
        contract.InitialWaterIndex = request.InitialWaterIndex!.Value;

        _auditLogger.Write(
            landlordUserId,
            "SuaChiSoDau",
            nameof(Contract),
            contract.Id,
            previous,
            new { contract.InitialElectricityIndex, contract.InitialWaterIndex });

        _notifier.Notify(
            contract.TenantUserId,
            "ChiSoDauDuocSua",
            "Chỉ số đầu của hợp đồng được sửa",
            $"Chủ trọ đã sửa chỉ số điện, nước lúc bàn giao của hợp đồng thuê phòng {RoomLabel(contract)}. " +
            "Hãy kiểm tra lại trên hợp đồng.",
            nameof(Contract),
            contract.Id);

        return await SaveAsync(cancellationToken);
    }

    /// <summary>Người thuê thấy hợp đồng mình đứng tên, kể cả ở Nháp; Chủ trọ thấy hợp đồng của phòng mình.</summary>
    public async Task<PagedResponse<ContractListItemResponse>> ListAsync(
        long userId,
        bool asLandlord,
        ContractStatus? status,
        long? roomId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Contracts.AsNoTracking();

        query = asLandlord
            ? query.Where(c => c.Room.Property.LandlordUserId == userId)
            : query.Where(c => c.TenantUserId == userId);

        if (status is not null)
        {
            query = query.Where(c => c.Status == status);
        }

        // Lọc theo phòng chỉ dành cho Chủ trọ.
        if (asLandlord && roomId is not null)
        {
            query = query.Where(c => c.RoomId == roomId);
        }

        var total = await query.CountAsync(cancellationToken);

        // Không có cột thời điểm lập; id tăng dần theo thứ tự lập nên dùng id để xếp hợp đồng mới lập trước.
        var rows = await query
            .OrderByDescending(c => c.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new
            {
                c.Id,
                c.RoomId,
                RoomCode = c.Room.Code,
                PropertyName = c.Room.Property.Name,
                TenantName = _db.Users.Where(u => u.Id == c.TenantUserId).Select(u => u.FullName).FirstOrDefault(),
                LandlordName = _db.Users
                    .Where(u => u.Id == c.Room.Property.LandlordUserId)
                    .Select(u => u.FullName)
                    .FirstOrDefault(),
                c.RentPrice,
                c.StartDate,
                c.EndDate,
                c.Status,
                ApprovedAt = c.RentalRequest != null ? c.RentalRequest.ProcessedAt : null
            })
            .ToListAsync(cancellationToken);

        var items = rows
            .Select(row => new ContractListItemResponse(
                row.Id,
                new RoomReferenceResponse(row.RoomId, row.RoomCode, row.PropertyName),
                row.TenantName ?? string.Empty,
                row.LandlordName ?? string.Empty,
                row.RentPrice,
                row.StartDate,
                row.EndDate,
                row.Status,
                Contract.AwaitingActivationStatuses.Contains(row.Status)
                    ? row.ApprovedAt + RentalRequest.HoldWindow
                    : null))
            .ToList();

        return new PagedResponse<ContractListItemResponse>(
            items, page, pageSize, total, (int)Math.Ceiling(total / (double)pageSize));
    }

    /// <summary>Chỉ người thuê đứng tên và Chủ trọ sở hữu phòng xem được; người khác nhận 404.</summary>
    public async Task<ServiceResult<ContractDetailResponse>> GetDetailAsync(
        long userId,
        long id,
        CancellationToken cancellationToken = default)
    {
        var contract = await _db.Contracts
            .AsNoTracking()
            .Include(c => c.Room)
            .ThenInclude(r => r.Property)
            .Include(c => c.RentalRequest)
            .Include(c => c.ServiceFees)
            .Include(c => c.Occupants)
            .AsSplitQuery()
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (contract is null)
        {
            return NotFound<ContractDetailResponse>();
        }

        var landlordUserId = contract.Room.Property.LandlordUserId;
        var viewerIsTenant = contract.TenantUserId == userId;

        if (!viewerIsTenant && landlordUserId != userId)
        {
            return NotFound<ContractDetailResponse>();
        }

        var people = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == contract.TenantUserId || u.Id == landlordUserId)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.PhoneNumber,
                u.BankBin,
                u.BankAccountNumber,
                u.BankAccountName
            })
            .ToListAsync(cancellationToken);

        var tenant = people.Single(p => p.Id == contract.TenantUserId);
        var landlord = people.Single(p => p.Id == landlordUserId);

        var revealPhones = await ArePhonesVisibleAsync(contract, cancellationToken);

        // BR-26, FR-79: mã VietQR cho tiền cọc chỉ dành cho người thuê đứng tên, khi hợp đồng chờ nhận cọc.
        // Số tiền và nội dung chuyển khoản do server tính.
        PaymentQrResponse? paymentQr =
            viewerIsTenant
            && contract.Status == ContractStatus.ChoNhanCoc
            && contract.DepositAmount > 0
            && landlord is { BankBin: { } bankBin, BankAccountNumber: { } accountNumber, BankAccountName: { } accountName }
                ? new PaymentQrResponse(bankBin, accountNumber, accountName, contract.DepositAmount, $"SMARTRENT COC{contract.Id}")
                : null;

        string? cancelledBy = contract.Status != ContractStatus.DaHuy
            ? null
            : contract.CancelledByUserId switch
            {
                null => "System",
                var by when by == contract.TenantUserId => "Tenant",
                _ => "Landlord"
            };

        DepositRefundResponse? depositRefund = contract is
        {
            DepositRefundedAmount: { } refundedAmount,
            DepositRefundedAt: { } refundedAt,
            DepositRefundMethod: { } refundMethod
        }
            ? new DepositRefundResponse(refundedAmount, refundedAt, refundMethod, contract.DepositRefundNote)
            : null;

        // Người thuê không thấy hóa đơn thanh lý khi nó còn ở Nháp (api-design mục 10).
        var settlementInvoiceId = await _db.Invoices
            .Where(i => i.ContractId == id
                        && i.Type == InvoiceType.ThanhLy
                        && (!viewerIsTenant || i.Status != InvoiceStatus.Nhap))
            .Select(i => (long?)i.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return ServiceResult<ContractDetailResponse>.Ok(new ContractDetailResponse(
            contract.Id,
            contract.RentalRequestId,
            new RoomReferenceResponse(contract.RoomId, contract.Room.Code, contract.Room.Property.Name),
            new ContractPartyResponse(tenant.FullName, revealPhones ? tenant.PhoneNumber : null),
            new ContractPartyResponse(landlord.FullName, revealPhones ? landlord.PhoneNumber : null),
            contract.RentPrice,
            contract.ElectricityUnitPrice,
            contract.WaterUnitPrice,
            contract.DepositAmount,
            contract.InitialElectricityIndex,
            contract.InitialWaterIndex,
            contract.StartDate,
            contract.EndDate,
            contract.PaymentDueDays,
            contract.ServiceFees
                .OrderBy(f => f.Id)
                .Select(f => new ContractServiceFeeResponse(f.Name, f.Amount))
                .ToList(),
            contract.Occupants
                .OrderBy(o => o.Id)
                .Select(o => new ContractOccupantResponse(o.FullName, o.PhoneNumber))
                .ToList(),
            contract.Status,
            contract.TenantConfirmedAt,
            contract.DepositReceivedAt,
            contract.DepositReceivedMethod,
            contract.ActivatedAt,
            contract.CancelReason,
            cancelledBy,
            contract.CancelledAt,
            contract.HoldDeadline,
            paymentQr,
            depositRefund,
            contract.IsAwaitingDepositRefund,
            SettlementService.MoveOutNoticeOf(contract),
            settlementInvoiceId,
            contract.TerminatedAt));
    }

    /// <summary>
    /// Tác vụ định kỳ — FR-36: hợp đồng chưa có hiệu lực mà quá 72 giờ giữ chỗ thì hệ thống hủy,
    /// phòng trở lại Trống, hai bên nhận thông báo.
    /// </summary>
    /// <returns>Số hợp đồng đã hủy.</returns>
    public async Task<int> CancelExpiredHoldsAsync(DateTimeOffset now, CancellationToken cancellationToken = default)
    {
        var approvedBefore = now - RentalRequest.HoldWindow;

        var ids = await _db.Contracts
            .Where(c => Contract.AwaitingActivationStatuses.Contains(c.Status)
                        && c.RentalRequest != null
                        && c.RentalRequest.ProcessedAt < approvedBefore)
            .Select(c => c.Id)
            .ToListAsync(cancellationToken);

        var cancelled = 0;

        foreach (var id in ids)
        {
            // Xử lý từng hợp đồng: một hợp đồng vừa bị người dùng thao tác cùng lúc không làm hỏng cả lượt chạy.
            _db.ChangeTracker.Clear();

            var contract = await FindAsync(id, cancellationToken);

            if (contract is null || !contract.IsHoldExpired(now))
            {
                continue;
            }

            contract.Cancel(null, "Hết hạn giữ chỗ 72 giờ mà hợp đồng chưa có hiệu lực.", now);
            ReleaseRoom(contract.Room);

            foreach (var recipient in new[] { contract.TenantUserId, contract.Room.Property.LandlordUserId })
            {
                _notifier.Notify(
                    recipient,
                    "HopDongBiHuy",
                    "Hợp đồng bị hủy do hết hạn giữ chỗ",
                    $"Hợp đồng thuê phòng {RoomLabel(contract)} đã bị hệ thống hủy vì quá 72 giờ giữ chỗ " +
                    "mà chưa có hiệu lực. Phòng đã trở lại trạng thái Trống.",
                    nameof(Contract),
                    contract.Id);
            }

            if ((await SaveAsync(cancellationToken)).Succeeded)
            {
                cancelled++;
            }
        }

        return cancelled;
    }

    /// <summary>
    /// Tác vụ định kỳ: hợp đồng Đang hiệu lực còn 15 ngày hoặc ít hơn tới ngày kết thúc chuyển Sắp hết hạn,
    /// hai bên nhận thông báo. Chỉ chọn hợp đồng còn Đang hiệu lực nên chạy lại không gửi trùng.
    /// </summary>
    /// <returns>Số hợp đồng đã chuyển.</returns>
    public async Task<int> MarkExpiringSoonAsync(DateTimeOffset now, CancellationToken cancellationToken = default)
    {
        var today = VietnamTime.DateOf(now);
        var endingOnOrBefore = today.AddDays(Contract.ExpiringSoonDays);

        var ids = await _db.Contracts
            .Where(c => c.Status == ContractStatus.DangHieuLuc && c.EndDate <= endingOnOrBefore)
            .Select(c => c.Id)
            .ToListAsync(cancellationToken);

        var marked = 0;

        foreach (var id in ids)
        {
            _db.ChangeTracker.Clear();

            var contract = await FindAsync(id, cancellationToken);

            if (contract is null || !contract.ShouldMarkExpiringSoon(today))
            {
                continue;
            }

            contract.MarkExpiringSoon(today);

            foreach (var recipient in new[] { contract.TenantUserId, contract.Room.Property.LandlordUserId })
            {
                _notifier.Notify(
                    recipient,
                    "HopDongSapHetHan",
                    "Hợp đồng sắp hết hạn",
                    $"Hợp đồng thuê phòng {RoomLabel(contract)} kết thúc ngày {contract.EndDate:dd/MM/yyyy}.",
                    nameof(Contract),
                    contract.Id);
            }

            if ((await SaveAsync(cancellationToken)).Succeeded)
            {
                marked++;
            }
        }

        return marked;
    }

    /// <summary>
    /// Tác vụ định kỳ — FR-94: hạn giữ chỗ còn dưới 24 giờ mà hợp đồng chưa có hiệu lực thì nhắc một lần
    /// bên đang phải thao tác: Chủ trọ khi chưa lập hợp đồng hoặc hợp đồng còn Nháp; người thuê khi hợp đồng
    /// chờ mình xác nhận; cả hai khi hợp đồng chờ nhận cọc.
    /// </summary>
    /// <returns>Số lời nhắc đã gửi.</returns>
    public async Task<int> RemindExpiringHoldsAsync(DateTimeOffset now, CancellationToken cancellationToken = default)
    {
        // Duyệt trong khoảng [now − 72 giờ, now − 48 giờ]: chưa hết hạn giữ chỗ và còn dưới 24 giờ.
        var approvedFrom = now - RentalRequest.HoldWindow;
        var approvedTo = now - (RentalRequest.HoldWindow - HoldReminderLead);

        var requestsWithoutContract = await _db.RentalRequests
            .AsNoTracking()
            .Where(r => r.Status == RentalRequestStatus.DaDuyet
                        && r.ProcessedAt >= approvedFrom
                        && r.ProcessedAt <= approvedTo)
            .Select(r => new
            {
                r.Id,
                r.Room.Property.LandlordUserId,
                RoomCode = r.Room.Code,
                PropertyName = r.Room.Property.Name
            })
            .ToListAsync(cancellationToken);

        var contracts = await _db.Contracts
            .AsNoTracking()
            .Where(c => Contract.AwaitingActivationStatuses.Contains(c.Status)
                        && c.RentalRequest != null
                        && c.RentalRequest.ProcessedAt >= approvedFrom
                        && c.RentalRequest.ProcessedAt <= approvedTo)
            .Select(c => new
            {
                c.Id,
                c.Status,
                c.TenantUserId,
                RentalRequestId = c.RentalRequestId!.Value,
                c.Room.Property.LandlordUserId,
                RoomCode = c.Room.Code,
                PropertyName = c.Room.Property.Name
            })
            .ToListAsync(cancellationToken);

        var sent = 0;

        foreach (var r in requestsWithoutContract)
        {
            if (await RemindLandlordOnceAsync(r.LandlordUserId, r.Id, $"{r.RoomCode} ({r.PropertyName})", cancellationToken))
            {
                sent++;
            }
        }

        foreach (var c in contracts)
        {
            var roomLabel = $"{c.RoomCode} ({c.PropertyName})";

            if ((c.Status is ContractStatus.Nhap or ContractStatus.ChoNhanCoc)
                && await RemindLandlordOnceAsync(c.LandlordUserId, c.RentalRequestId, roomLabel, cancellationToken))
            {
                sent++;
            }

            if ((c.Status is ContractStatus.ChoNguoiThueXacNhan or ContractStatus.ChoNhanCoc)
                && await RemindOnceAsync(
                    c.TenantUserId,
                    "NhacNopCoc",
                    "Sắp hết hạn giữ chỗ",
                    $"Hạn giữ chỗ phòng {roomLabel} còn dưới 24 giờ. Hãy xác nhận điều khoản hợp đồng và nộp cọc, " +
                    "nếu không hợp đồng sẽ tự hủy.",
                    nameof(Contract),
                    c.Id,
                    cancellationToken))
            {
                sent++;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);

        return sent;
    }

    private Task<bool> RemindLandlordOnceAsync(
        long landlordUserId,
        long rentalRequestId,
        string roomLabel,
        CancellationToken cancellationToken)
        => RemindOnceAsync(
            landlordUserId,
            "NhacHoanTatHopDong",
            "Sắp hết hạn giữ chỗ",
            $"Hạn giữ chỗ phòng {roomLabel} còn dưới 24 giờ. Hãy lập và gửi hợp đồng, " +
            "hoặc xác nhận đã nhận cọc nếu người thuê đã nộp, nếu không phòng sẽ trở lại trạng thái Trống.",
            nameof(RentalRequest),
            rentalRequestId,
            cancellationToken);

    /// <summary>Mỗi bên nhận tối đa một lần nhắc cho mỗi lần giữ chỗ — chạy lại tác vụ không gửi trùng.</summary>
    private async Task<bool> RemindOnceAsync(
        long recipientUserId,
        string eventType,
        string title,
        string content,
        string relatedEntityType,
        long relatedEntityId,
        CancellationToken cancellationToken)
    {
        var alreadyReminded = await _db.Notifications.AnyAsync(
            n => n.RecipientUserId == recipientUserId
                 && n.EventType == eventType
                 && n.RelatedEntityType == relatedEntityType
                 && n.RelatedEntityId == relatedEntityId,
            cancellationToken);

        if (alreadyReminded)
        {
            return false;
        }

        _notifier.Notify(recipientUserId, eventType, title, content, relatedEntityType, relatedEntityId);
        return true;
    }

    /// <summary>
    /// QR-07: số điện thoại hai bên hiện cho tới khi hợp đồng kết thúc hẳn — chưa kết thúc; đã hủy mà còn
    /// chờ hoàn cọc; hoặc đã thanh lý mà hóa đơn thanh lý còn nợ.
    /// </summary>
    private async Task<bool> ArePhonesVisibleAsync(Contract contract, CancellationToken cancellationToken)
    {
        if (!contract.IsClosed)
        {
            return true;
        }

        if (contract.Status == ContractStatus.DaHuy)
        {
            return contract.IsAwaitingDepositRefund;
        }

        return await _db.Invoices.AnyAsync(
            i => i.ContractId == contract.Id
                 && i.Type == InvoiceType.ThanhLy
                 && i.Status != InvoiceStatus.DaHuy
                 && i.Status != InvoiceStatus.DaThanhToan
                 && i.TotalAmount > i.PaidAmount,
            cancellationToken);
    }

    /// <summary>
    /// Ràng buộc 422 của điều khoản (api-design.md mục 8). Ngày bắt đầu so với hôm nay theo giờ Việt Nam,
    /// áp dụng cả khi lập lẫn khi sửa hợp đồng nháp.
    /// </summary>
    private static string? ValidateTerms(ContractTermsRequest terms, Room room, DateTimeOffset now)
    {
        var startDate = terms.StartDate!.Value;

        if (startDate < VietnamTime.DateOf(now))
        {
            return "Ngày bắt đầu không được trước ngày lập hợp đồng.";
        }

        if (terms.EndDate!.Value <= startDate)
        {
            return "Ngày kết thúc phải sau ngày bắt đầu.";
        }

        // BR-11: người đứng tên cộng người ở cùng.
        var occupantCount = 1 + (terms.Occupants?.Count ?? 0);

        if (occupantCount > room.MaxOccupants)
        {
            return $"Tổng số người ở ({occupantCount}) vượt số người tối đa của phòng ({room.MaxOccupants}).";
        }

        return null;
    }

    /// <summary>BR-12: chốt cứng điều khoản vào hợp đồng; phí dịch vụ là bản sao, không tham chiếu tới phòng.</summary>
    private static void ApplyTerms(Contract contract, ContractTermsRequest terms)
    {
        contract.RentPrice = terms.RentPrice!.Value;
        contract.ElectricityUnitPrice = terms.ElectricityUnitPrice!.Value;
        contract.WaterUnitPrice = terms.WaterUnitPrice!.Value;
        contract.DepositAmount = terms.DepositAmount!.Value;
        contract.InitialElectricityIndex = terms.InitialElectricityIndex!.Value;
        contract.InitialWaterIndex = terms.InitialWaterIndex!.Value;
        contract.StartDate = terms.StartDate!.Value;
        contract.EndDate = terms.EndDate!.Value;
        contract.PaymentDueDays = terms.PaymentDueDays!.Value;

        contract.ServiceFees.Clear();

        foreach (var fee in terms.ServiceFees ?? [])
        {
            contract.ServiceFees.Add(new ContractServiceFee
            {
                Name = fee.Name.Trim(),
                Amount = fee.Amount!.Value
            });
        }

        contract.Occupants.Clear();

        foreach (var occupant in terms.Occupants ?? [])
        {
            contract.Occupants.Add(new ContractOccupant
            {
                FullName = occupant.FullName.Trim(),
                PhoneNumber = string.IsNullOrWhiteSpace(occupant.PhoneNumber) ? null : occupant.PhoneNumber.Trim()
            });
        }
    }

    /// <summary>FR-35: hợp đồng có hiệu lực thì phòng chuyển Đang thuê và cả hai bên nhận thông báo.</summary>
    private void OnActivated(Contract contract)
    {
        contract.Room.OccupancyStatus = RoomOccupancyStatus.DangThue;

        foreach (var recipient in new[] { contract.TenantUserId, contract.Room.Property.LandlordUserId })
        {
            _notifier.Notify(
                recipient,
                "HopDongCoHieuLuc",
                "Hợp đồng đã có hiệu lực",
                $"Hợp đồng thuê phòng {RoomLabel(contract)} đã có hiệu lực.",
                nameof(Contract),
                contract.Id);
        }
    }

    /// <summary>Hợp đồng bị hủy trước ngày bắt đầu: phòng đang giữ chỗ hoặc đang thuê trở lại Trống.</summary>
    private static void ReleaseRoom(Room room)
    {
        if (room.OccupancyStatus is RoomOccupancyStatus.DangGiuCho or RoomOccupancyStatus.DangThue)
        {
            room.OccupancyStatus = RoomOccupancyStatus.Trong;
        }
    }

    private Task<Contract?> FindAsync(long id, CancellationToken cancellationToken)
        => _db.Contracts
            .Include(c => c.Room)
            .ThenInclude(r => r.Property)
            .Include(c => c.RentalRequest)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    /// <summary>Thao tác khác vừa đổi cùng hợp đồng thì trả 409 thay vì ghi đè.</summary>
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

    /// <summary>Như <see cref="SaveAsync"/>, thêm unique index của BR-07 là lớp chặn cuối khi kích hoạt hợp đồng.</summary>
    private async Task<ServiceResult> SaveActivationAsync(CancellationToken cancellationToken)
    {
        try
        {
            return await SaveAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, RoomOccupiedMessage);
        }
    }

    private static bool IsLandlordOf(Contract contract, long userId)
        => contract.Room.Property.LandlordUserId == userId;

    /// <summary>Tên phòng kèm khu trọ trong nội dung thông báo. Cần nạp Room và Property.</summary>
    internal static string RoomLabel(Contract contract)
        => $"{contract.Room.Code} ({contract.Room.Property.Name})";

    private static ServiceResult NotFound()
        => ServiceResult.Fail(StatusCodes.Status404NotFound, "Không tìm thấy hợp đồng.");

    /// <summary>
    /// 409 khi điều kiện Can... của hợp đồng sai: báo quá hạn giữ chỗ nếu đó là lý do,
    /// ngược lại báo sai trạng thái.
    /// </summary>
    private static ServiceResult Conflict(Contract contract, DateTimeOffset now, string wrongStatusMessage)
        => ServiceResult.Fail(
            StatusCodes.Status409Conflict,
            contract.IsHoldExpired(now) ? HoldExpiredMessage : wrongStatusMessage);

    private static ServiceResult<T> NotFound<T>()
        => ServiceResult<T>.Fail(StatusCodes.Status404NotFound, "Không tìm thấy hợp đồng.");
}
