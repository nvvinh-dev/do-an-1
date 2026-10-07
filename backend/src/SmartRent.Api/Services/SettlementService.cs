using Microsoft.EntityFrameworkCore;
using SmartRent.Api.Contracts;
using SmartRent.Domain;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Persistence;

namespace SmartRent.Api.Services;

/// <summary>
/// Chấm dứt hợp đồng — BP-10: gửi và rút thông báo trả phòng (FR-53, FR-87, FR-98).
/// </summary>
public class SettlementService
{
    private const string NotFoundMessage = "Không tìm thấy hợp đồng.";

    private readonly AppDbContext _db;
    private readonly Notifier _notifier;

    public SettlementService(AppDbContext db, Notifier notifier)
    {
        _db = db;
        _notifier = notifier;
    }

    /// <summary>
    /// FR-53, FR-87: một trong hai bên gửi thông báo trả phòng; hợp đồng chuyển Đang thanh lý, bên còn lại nhận
    /// thông báo. Báo trước ít hơn 30 ngày vẫn được nhận — response cho biết có được tính phí phạt hay không.
    /// </summary>
    public async Task<ServiceResult<MoveOutNoticeResponse>> SendMoveOutNoticeAsync(
        long userId,
        long id,
        SendMoveOutNoticeRequest request,
        CancellationToken cancellationToken = default)
    {
        var contract = await FindAsync(id, cancellationToken);

        if (contract is null || !IsPartyOf(contract, userId))
        {
            return ServiceResult<MoveOutNoticeResponse>.Fail(StatusCodes.Status404NotFound, NotFoundMessage);
        }

        var now = DateTimeOffset.UtcNow;
        var today = VietnamTime.DateOf(now);

        if (!contract.CanSendMoveOutNotice(today))
        {
            return ServiceResult<MoveOutNoticeResponse>.Fail(
                StatusCodes.Status409Conflict,
                contract.Status is ContractStatus.DangHieuLuc or ContractStatus.SapHetHan
                    ? "Hợp đồng chưa tới ngày bắt đầu nên chưa gửi được thông báo trả phòng. " +
                      "Muốn chấm dứt trước ngày bắt đầu thì hủy hợp đồng."
                    : "Chỉ gửi được thông báo trả phòng khi hợp đồng đang hiệu lực hoặc sắp hết hạn.");
        }

        var expectedMoveOutDate = request.ExpectedMoveOutDate!.Value;

        if (expectedMoveOutDate < today)
        {
            return ServiceResult<MoveOutNoticeResponse>.Fail(
                StatusCodes.Status422UnprocessableEntity, "Ngày trả phòng dự kiến không được trước hôm nay.");
        }

        var reason = request.Reason.Trim();
        contract.SendMoveOutNotice(userId, expectedMoveOutDate, reason, now);

        _notifier.Notify(
            OtherPartyOf(contract, userId),
            "ThongBaoTraPhong",
            "Thông báo trả phòng",
            $"{PartyName(contract, userId)} đã gửi thông báo trả phòng {ContractService.RoomLabel(contract)}, " +
            $"ngày trả phòng dự kiến {expectedMoveOutDate:dd/MM/yyyy}. Lý do: {reason}",
            nameof(Contract),
            contract.Id);

        // Thao tác khác vừa đổi cùng hợp đồng thì DbUpdateConcurrencyException được
        // ConcurrencyConflictExceptionHandler trả 409.
        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult<MoveOutNoticeResponse>.Ok(MoveOutNoticeOf(contract)!);
    }

    /// <summary>
    /// FR-98, BP-10 A4: bên đã gửi rút thông báo trả phòng khi Chủ trọ chưa lập hóa đơn thanh lý; hợp đồng về
    /// Sắp hết hạn hoặc Đang hiệu lực theo số ngày còn lại, bên còn lại nhận thông báo.
    /// </summary>
    public async Task<ServiceResult> WithdrawMoveOutNoticeAsync(
        long userId,
        long id,
        CancellationToken cancellationToken = default)
    {
        var contract = await FindAsync(id, cancellationToken);

        if (contract is null || !IsPartyOf(contract, userId))
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, NotFoundMessage);
        }

        var hasSettlementInvoice = await _db.Invoices.AnyAsync(
            i => i.ContractId == id && i.Type == InvoiceType.ThanhLy,
            cancellationToken);

        if (!contract.CanWithdrawMoveOutNotice(userId, hasSettlementInvoice))
        {
            return ServiceResult.Fail(
                StatusCodes.Status409Conflict,
                contract.Status != ContractStatus.DangThanhLy
                    ? "Hợp đồng không có thông báo trả phòng nào để rút."
                    : contract.MoveOutNoticeByUserId != userId
                        ? "Chỉ bên đã gửi thông báo trả phòng được rút thông báo."
                        : "Chủ trọ đã lập hóa đơn thanh lý nên không rút được thông báo trả phòng.");
        }

        contract.WithdrawMoveOutNotice(userId, hasSettlementInvoice, VietnamTime.DateOf(DateTimeOffset.UtcNow));

        // Hợp đồng về thẳng Sắp hết hạn thì tác vụ định kỳ (chỉ chọn Đang hiệu lực) không gửi HopDongSapHetHan,
        // nên báo ngày kết thúc ngay trong thông báo này. Câu chữ đúng cả khi đã qua ngày kết thúc.
        var continuation = contract.Status == ContractStatus.SapHetHan
            ? $"Hợp đồng tiếp tục hiệu lực theo điều khoản đã chốt; ngày kết thúc ghi trên hợp đồng là {contract.EndDate:dd/MM/yyyy}."
            : "Hợp đồng tiếp tục hiệu lực theo điều khoản đã chốt.";

        _notifier.Notify(
            OtherPartyOf(contract, userId),
            "ThongBaoTraPhongBiRut",
            "Thông báo trả phòng đã được rút",
            $"{PartyName(contract, userId)} đã rút thông báo trả phòng {ContractService.RoomLabel(contract)}. {continuation}",
            nameof(Contract),
            contract.Id);

        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    /// <summary>Trường <c>moveOutNotice</c> của chi tiết hợp đồng; null khi hợp đồng chưa có thông báo trả phòng.</summary>
    internal static MoveOutNoticeResponse? MoveOutNoticeOf(Contract contract)
        => contract is
        {
            MoveOutNoticeAt: { } noticeAt,
            MoveOutNoticeByUserId: { } noticeBy,
            ExpectedMoveOutDate: { } expectedMoveOutDate,
            MoveOutNoticeDays: { } noticeDays
        }
            ? new MoveOutNoticeResponse(
                noticeAt,
                noticeBy == contract.TenantUserId ? "Tenant" : "Landlord",
                expectedMoveOutDate,
                contract.TerminationReason ?? string.Empty,
                noticeDays,
                contract.IsMoveOutPenaltyAllowed)
            : null;

    private Task<Contract?> FindAsync(long id, CancellationToken cancellationToken)
        => _db.Contracts
            .Include(c => c.Room)
            .ThenInclude(r => r.Property)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    /// <summary>Người thuê đứng tên hoặc Chủ trọ sở hữu phòng; người khác nhận 404 (BR-04).</summary>
    private static bool IsPartyOf(Contract contract, long userId)
        => userId == contract.TenantUserId || userId == contract.Room.Property.LandlordUserId;

    private static long OtherPartyOf(Contract contract, long userId)
        => userId == contract.TenantUserId ? contract.Room.Property.LandlordUserId : contract.TenantUserId;

    private static string PartyName(Contract contract, long userId)
        => userId == contract.TenantUserId ? "Người thuê" : "Chủ trọ";
}
