using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SmartRent.Api.Contracts;
using SmartRent.Domain;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Persistence;
using SmartRent.Infrastructure.Storage;

namespace SmartRent.Api.Services;

/// <summary>
/// Chấm dứt hợp đồng — BP-10: gửi và rút thông báo trả phòng (FR-53, FR-87, FR-98); lập và sửa hóa đơn thanh lý
/// (FR-54 tới FR-56, FR-92, FR-93).
/// </summary>
public class SettlementService
{
    private const string NotFoundMessage = "Không tìm thấy hợp đồng.";

    private const string NoSettlementInvoiceMessage = "Hợp đồng chưa có hóa đơn thanh lý.";

    private const string MoveOutDateInFutureMessage =
        "Hóa đơn thanh lý lập vào hoặc sau ngày trả phòng thực tế — ngày trả phòng không được sau hôm nay.";

    /// <summary>
    /// Số dòng Chủ trọ gửi tối đa trong một bảng thanh lý (api-design mục 10). Mỗi ảnh hư hỏng là một lần gọi Storage,
    /// nên giới hạn số dòng cũng giới hạn số lần gọi trong một request.
    /// </summary>
    private const int MaxSettlementLines = 50;

    private const string AmountTooLargeMessage =
        "Số tiền của hóa đơn thanh lý quá lớn. Kiểm tra lại chỉ số điện nước và số tiền của các dòng.";

    private readonly AppDbContext _db;
    private readonly Notifier _notifier;
    private readonly AuditLogger _auditLogger;
    private readonly IFileStorage _fileStorage;
    private readonly InvoiceDetailBuilder _invoiceDetailBuilder;

    public SettlementService(
        AppDbContext db,
        Notifier notifier,
        AuditLogger auditLogger,
        IFileStorage fileStorage,
        InvoiceDetailBuilder invoiceDetailBuilder)
    {
        _db = db;
        _notifier = notifier;
        _auditLogger = auditLogger;
        _fileStorage = fileStorage;
        _invoiceDetailBuilder = invoiceDetailBuilder;
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

    /// <summary>
    /// FR-54, FR-55, FR-92, FR-93: Chủ trọ lập hóa đơn thanh lý ở Nháp, vào hoặc sau ngày trả phòng thực tế. Hệ thống tự
    /// thêm một dòng công nợ cho mỗi hóa đơn còn nợ — hóa đơn đó chuyển Đã chuyển thanh lý — và dòng trừ tiền cọc.
    /// Người thuê chưa thấy hóa đơn ở Nháp nên không gửi thông báo.
    /// </summary>
    public async Task<ServiceResult<InvoiceDetailResponse>> CreateSettlementInvoiceAsync(
        long landlordUserId,
        long id,
        SettlementInvoiceRequest request,
        CancellationToken cancellationToken = default)
    {
        var contract = await FindForSettlementInvoiceAsync(id, cancellationToken);

        if (contract is null || contract.Room.Property.LandlordUserId != landlordUserId)
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(StatusCodes.Status404NotFound, NotFoundMessage);
        }

        if (contract.Status != ContractStatus.DangThanhLy)
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(
                StatusCodes.Status409Conflict, "Chỉ lập được hóa đơn thanh lý khi hợp đồng đang thanh lý.");
        }

        // Theo dõi thay đổi: các hóa đơn còn nợ sẽ chuyển Đã chuyển thanh lý.
        var invoices = await _db.Invoices
            .Where(i => i.ContractId == id)
            .ToListAsync(cancellationToken);

        if (invoices.Any(i => i.Type == InvoiceType.ThanhLy))
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(
                StatusCodes.Status409Conflict, "Hợp đồng đã có hóa đơn thanh lý.");
        }

        if (request.MoveOutDate!.Value > VietnamTime.DateOf(DateTimeOffset.UtcNow))
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(StatusCodes.Status409Conflict, MoveOutDateInFutureMessage);
        }

        if (invoices.Any(i => i.Type == InvoiceType.DinhKy && i.Status == InvoiceStatus.Nhap))
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(
                StatusCodes.Status409Conflict,
                "Hợp đồng còn hóa đơn định kỳ ở Nháp. Phát hành hoặc hủy hóa đơn đó trước khi lập hóa đơn thanh lý.");
        }

        var hasPendingPaymentReport = await _db.PaymentReports.AnyAsync(
            p => p.Invoice.ContractId == id && p.Status == PaymentReportStatus.ChoXacNhan,
            cancellationToken);

        if (hasPendingPaymentReport)
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(
                StatusCodes.Status409Conflict,
                "Hợp đồng còn lượt báo thanh toán chờ xác nhận. Xác nhận hoặc từ chối trước khi lập hóa đơn thanh lý.");
        }

        var prepared = await PrepareSettlementInvoiceAsync(landlordUserId, contract, invoices, request, cancellationToken);

        if (!prepared.Succeeded)
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(prepared.StatusCode, prepared.Error!);
        }

        var draft = prepared.Value!;

        // FR-92: kết chuyển công nợ trong cùng transaction với hóa đơn thanh lý.
        var debtLines = invoices
            .Where(i => i.CanCarryOverToSettlement)
            .Select(i => i.CarryOverToSettlement())
            .ToList();

        var calculation = SettlementCalculator.Calculate(
            contract, draft.Period, draft.Electricity, draft.Water, debtLines, draft.LandlordLines);

        if (!calculation.Amounts.FitsMoneyColumns)
        {
            // Chưa lưu gì: trạng thái kết chuyển vừa gán chỉ nằm trong DbContext của request này.
            return ServiceResult<InvoiceDetailResponse>.Fail(
                StatusCodes.Status422UnprocessableEntity, AmountTooLargeMessage);
        }

        var invoice = new Invoice
        {
            ContractId = contract.Id,
            Contract = contract,
            Type = InvoiceType.ThanhLy,
            Status = InvoiceStatus.Nhap
        };

        ApplySettlementInvoice(invoice, contract, draft, calculation);
        _db.Invoices.Add(invoice);
        MarkContractChanged(contract);

        // Cần id hóa đơn để ghi nhật ký, nên lưu hai lần trong một transaction.
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Hai request lập gần như đồng thời: unique index ux_invoices_contract_thanh_ly chặn bên sau (FR-54).
            return ServiceResult<InvoiceDetailResponse>.Fail(
                StatusCodes.Status409Conflict, "Hợp đồng đã có hóa đơn thanh lý.");
        }

        _auditLogger.Write(
            landlordUserId,
            "TaoHoaDon",
            nameof(Invoice),
            invoice.Id,
            newValue: SettlementInvoiceAudit.Of(invoice));

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return ServiceResult<InvoiceDetailResponse>.Ok(
            await _invoiceDetailBuilder.BuildAsync(invoice, paymentQr: null, cancellationToken));
    }

    /// <summary>
    /// FR-57: Chủ trọ sửa hóa đơn thanh lý khi còn ở Nháp, body giống lúc lập; server tính lại toàn bộ số tiền. Dòng công
    /// nợ đã kết chuyển lúc lập giữ nguyên; các dòng Chủ trọ gửi được thay mới. Ghi nhật ký giá trị cũ và mới (BR-23).
    /// </summary>
    public async Task<ServiceResult<InvoiceDetailResponse>> UpdateSettlementInvoiceAsync(
        long landlordUserId,
        long id,
        SettlementInvoiceRequest request,
        CancellationToken cancellationToken = default)
    {
        var contract = await FindForSettlementInvoiceAsync(id, cancellationToken);

        if (contract is null || contract.Room.Property.LandlordUserId != landlordUserId)
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(StatusCodes.Status404NotFound, NotFoundMessage);
        }

        var invoices = await _db.Invoices
            .Include(i => i.Lines)
            .Include(i => i.PaymentReports)
            .Where(i => i.ContractId == id)
            .ToListAsync(cancellationToken);

        var settlementInvoice = invoices.FirstOrDefault(i => i.Type == InvoiceType.ThanhLy);

        if (settlementInvoice is null)
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(
                StatusCodes.Status404NotFound, NoSettlementInvoiceMessage);
        }

        if (settlementInvoice.Status != InvoiceStatus.Nhap)
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(
                StatusCodes.Status409Conflict, "Chỉ sửa được hóa đơn thanh lý khi còn ở Nháp.");
        }

        if (request.MoveOutDate!.Value > VietnamTime.DateOf(DateTimeOffset.UtcNow))
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(StatusCodes.Status409Conflict, MoveOutDateInFutureMessage);
        }

        var otherInvoices = invoices.Where(i => i.Id != settlementInvoice.Id).ToList();
        var prepared = await PrepareSettlementInvoiceAsync(landlordUserId, contract, otherInvoices, request, cancellationToken);

        if (!prepared.Succeeded)
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(prepared.StatusCode, prepared.Error!);
        }

        var draft = prepared.Value!;

        // Dòng công nợ đã kết chuyển lúc lập giữ nguyên; các dòng Chủ trọ gửi và dòng trừ cọc được dựng lại.
        var debtLines = settlementInvoice.Lines
            .Where(l => l.Category == InvoiceLineCategory.CongNoKyTruoc)
            .ToList();

        var calculation = SettlementCalculator.Calculate(
            contract, draft.Period, draft.Electricity, draft.Water, debtLines, draft.LandlordLines);

        if (!calculation.Amounts.FitsMoneyColumns)
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(
                StatusCodes.Status422UnprocessableEntity, AmountTooLargeMessage);
        }

        var before = SettlementInvoiceAudit.Of(settlementInvoice);

        ApplySettlementInvoice(settlementInvoice, contract, draft, calculation);
        MarkContractChanged(contract);

        _auditLogger.Write(
            landlordUserId,
            "SuaHoaDon",
            nameof(Invoice),
            settlementInvoice.Id,
            before,
            SettlementInvoiceAudit.Of(settlementInvoice));

        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult<InvoiceDetailResponse>.Ok(
            await _invoiceDetailBuilder.BuildAsync(settlementInvoice, paymentQr: null, cancellationToken));
    }

    /// <summary>FR-57: Chủ trọ gửi bảng thanh lý đang ở Nháp cho người thuê xác nhận; người thuê nhận thông báo.</summary>
    public async Task<ServiceResult> SendSettlementInvoiceAsync(
        long landlordUserId,
        long id,
        CancellationToken cancellationToken = default)
    {
        var (contract, invoice) = await FindSettlementInvoiceAsync(id, cancellationToken);

        if (contract is null || contract.Room.Property.LandlordUserId != landlordUserId)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, NotFoundMessage);
        }

        if (invoice is null)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, NoSettlementInvoiceMessage);
        }

        if (!invoice.CanSendSettlement)
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, "Chỉ gửi được bảng thanh lý đang ở Nháp.");
        }

        invoice.SendSettlement(DateTimeOffset.UtcNow);
        MarkContractChanged(contract);

        _notifier.Notify(
            contract.TenantUserId,
            "BangThanhLyChoXacNhan",
            "Bảng thanh lý chờ bạn xác nhận",
            $"Chủ trọ đã gửi bảng thanh lý {ContractService.RoomLabel(contract)}. {BalanceText(invoice, forTenant: true)} " +
            "Vui lòng đồng ý, hoặc gửi lý do nếu chưa đồng ý.",
            nameof(Invoice),
            invoice.Id);

        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    /// <summary>
    /// FR-57: người thuê chưa đồng ý bảng thanh lý, lý do bắt buộc — bảng về Nháp để Chủ trọ sửa và gửi lại, Chủ trọ
    /// nhận thông báo kèm lý do.
    /// </summary>
    public async Task<ServiceResult> RequestSettlementInvoiceChangesAsync(
        long tenantUserId,
        long id,
        SettlementChangeRequest request,
        CancellationToken cancellationToken = default)
    {
        var (contract, invoice) = await FindSettlementInvoiceAsync(id, cancellationToken);

        if (TenantSettlementInvoiceError(contract, invoice, tenantUserId) is { } error)
        {
            return error;
        }

        var reason = request.Reason.Trim();
        invoice!.RequestSettlementChanges(reason);
        MarkContractChanged(contract!);

        _notifier.Notify(
            contract!.Room.Property.LandlordUserId,
            "BangThanhLyCanChinhSua",
            "Người thuê chưa đồng ý bảng thanh lý",
            $"Người thuê chưa đồng ý bảng thanh lý {ContractService.RoomLabel(contract)}. Lý do: {reason}",
            nameof(Invoice),
            invoice.Id);

        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    /// <summary>
    /// FR-57: người thuê đồng ý — bảng bị khóa theo dấu số dư: dương thành khoản chờ thanh toán có hạn tính từ lúc
    /// khóa, âm chờ Chủ trọ hoàn cọc, bằng 0 là đã tất toán. Chủ trọ nhận thông báo.
    /// </summary>
    public async Task<ServiceResult> ConfirmSettlementInvoiceAsync(
        long tenantUserId,
        long id,
        CancellationToken cancellationToken = default)
    {
        var (contract, invoice) = await FindSettlementInvoiceAsync(id, cancellationToken);

        if (TenantSettlementInvoiceError(contract, invoice, tenantUserId) is { } error)
        {
            return error;
        }

        invoice!.ConfirmSettlementByTenant(DateTimeOffset.UtcNow, contract!.PaymentDueDays);
        MarkContractChanged(contract);

        _notifier.Notify(
            contract.Room.Property.LandlordUserId,
            "BangThanhLyDuocDongY",
            "Người thuê đã đồng ý bảng thanh lý",
            $"Người thuê đã đồng ý bảng thanh lý {ContractService.RoomLabel(contract)}, bảng đã khóa. " +
            BalanceText(invoice, forTenant: false),
            nameof(Invoice),
            invoice.Id);

        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    /// <summary>
    /// FR-95: bảng đã gửi quá 7 ngày (168 giờ) kể từ lần gửi gần nhất mà người thuê không phản hồi thì Chủ trọ tự chốt,
    /// ghi chú bắt buộc; bảng bị khóa như khi người thuê đồng ý. Ghi nhật ký (BR-23) và thông báo cho người thuê.
    /// </summary>
    public async Task<ServiceResult> FinalizeSettlementInvoiceAsync(
        long landlordUserId,
        long id,
        SettlementFinalizeRequest request,
        CancellationToken cancellationToken = default)
    {
        var (contract, invoice) = await FindSettlementInvoiceAsync(id, cancellationToken);

        if (contract is null || contract.Room.Property.LandlordUserId != landlordUserId)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, NotFoundMessage);
        }

        if (invoice is null)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, NoSettlementInvoiceMessage);
        }

        if (!invoice.IsAwaitingTenantSettlementConfirmation)
        {
            return ServiceResult.Fail(
                StatusCodes.Status409Conflict, "Chỉ tự chốt được bảng thanh lý đang chờ người thuê xác nhận.");
        }

        var now = DateTimeOffset.UtcNow;

        if (!invoice.CanFinalizeSettlement(now))
        {
            var allowedAfter = VietnamTime.ToVietnamTime(invoice.SettlementFinalizeAllowedAfter!.Value);

            return ServiceResult.Fail(
                StatusCodes.Status409Conflict,
                "Bảng thanh lý gửi chưa quá 7 ngày nên chưa tự chốt được. " +
                $"Người thuê không phản hồi thì tự chốt được sau {allowedAfter:HH:mm} ngày {allowedAfter:dd/MM/yyyy}.");
        }

        var note = request.Note.Trim();
        var sentAt = invoice.SentAt;
        invoice.FinalizeSettlementByLandlord(note, now, contract.PaymentDueDays);
        MarkContractChanged(contract);

        _auditLogger.Write(
            landlordUserId,
            "TuChotBangThanhLy",
            nameof(Invoice),
            invoice.Id,
            new { Status = nameof(InvoiceStatus.ChoNguoiThueXacNhan), SentAt = sentAt },
            new { Status = invoice.Status.ToString(), Note = note, invoice.TotalAmount, invoice.DueDate });

        _notifier.Notify(
            contract.TenantUserId,
            "BangThanhLyDuocTuChot",
            "Chủ trọ đã tự chốt bảng thanh lý",
            $"Bạn chưa phản hồi bảng thanh lý {ContractService.RoomLabel(contract)} sau 7 ngày nên Chủ trọ đã tự chốt. " +
            $"Ghi chú của Chủ trọ: {note}. {BalanceText(invoice, forTenant: true)}",
            nameof(Invoice),
            invoice.Id);

        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    /// <summary>
    /// FR-58, FR-59, FR-86, FR-96: Chủ trọ hoàn tất thanh lý khi bảng đã khóa. Số dư âm: ghi nhận hoàn cọc — số tiền do
    /// server tính bằng phần cọc dư — và hóa đơn sang Đã thanh toán. Số dư dương chưa trả đủ vẫn hoàn tất, phần còn thiếu
    /// giữ nguyên trên hóa đơn như một khoản nợ. Hợp đồng sang Đã thanh lý, phòng sang Trống hoặc Bảo trì; ghi nhật ký
    /// (BR-23) và thông báo cho hai bên, tất cả trong một transaction (security-design mục 8, điều 10).
    /// </summary>
    public async Task<ServiceResult> CompleteSettlementAsync(
        long landlordUserId,
        long id,
        CompleteSettlementRequest request,
        CancellationToken cancellationToken = default)
    {
        var (contract, invoice) = await FindSettlementInvoiceAsync(id, cancellationToken);

        if (contract is null || contract.Room.Property.LandlordUserId != landlordUserId)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, NotFoundMessage);
        }

        if (!contract.CanCompleteSettlement)
        {
            return ServiceResult.Fail(
                StatusCodes.Status409Conflict, "Chỉ hoàn tất thanh lý được hợp đồng đang thanh lý.");
        }

        if (invoice is null || !invoice.IsSettlementLocked)
        {
            return ServiceResult.Fail(
                StatusCodes.Status409Conflict,
                "Bảng thanh lý chưa khóa. Chờ người thuê đồng ý, hoặc tự chốt khi người thuê không phản hồi quá 7 ngày.");
        }

        var now = DateTimeOffset.UtcNow;

        if (invoice.Status == InvoiceStatus.ChoHoanCoc)
        {
            if (request.RefundedAt is not { } requestedRefundedAt || request.RefundMethod is not { } refundMethod)
            {
                return ServiceResult.Fail(
                    StatusCodes.Status422UnprocessableEntity,
                    "Bảng thanh lý có số dư âm: phải ghi thời điểm và hình thức hoàn cọc.");
            }

            var refundedAt = requestedRefundedAt.ToUniversalTime();

            if (!contract.IsValidSettlementRefundTime(refundedAt, now))
            {
                return ServiceResult.Fail(
                    StatusCodes.Status422UnprocessableEntity,
                    "Thời điểm hoàn cọc phải từ lúc gửi thông báo trả phòng tới thời điểm hiện tại.");
            }

            // FR-86: số hoàn do server tính bằng phần cọc dư, không nhận từ client.
            contract.RecordSettlementRefund(-invoice.TotalAmount, refundedAt, refundMethod);
            invoice.CompleteDepositRefund(now);
        }

        var roomNextStatus = request.RoomNextStatus!.Value;
        contract.CompleteSettlement(now);
        contract.Room.ReleaseAfterSettlement(roomNextStatus);

        // BR-23: hoàn tất thanh lý, gồm thông tin hoàn cọc nếu có.
        _auditLogger.Write(
            landlordUserId,
            "HoanTatThanhLy",
            nameof(Contract),
            contract.Id,
            new
            {
                Status = nameof(ContractStatus.DangThanhLy),
                RoomStatus = nameof(RoomOccupancyStatus.DangThue)
            },
            new
            {
                Status = contract.Status.ToString(),
                contract.TerminatedAt,
                RoomStatus = roomNextStatus.ToString(),
                SettlementInvoiceId = invoice.Id,
                InvoiceStatus = invoice.Status.ToString(),
                invoice.TotalAmount,
                invoice.PaidAmount,
                contract.DepositRefundedAmount,
                contract.DepositRefundedAt,
                DepositRefundMethod = contract.DepositRefundMethod?.ToString()
            });

        _notifier.Notify(
            contract.TenantUserId,
            "HoanTatThanhLy",
            "Hợp đồng đã hoàn tất thanh lý",
            $"Hợp đồng thuê phòng {ContractService.RoomLabel(contract)} đã hoàn tất thanh lý. " +
            SettlementOutcomeText(contract, invoice, forTenant: true),
            nameof(Contract),
            contract.Id);

        _notifier.Notify(
            contract.Room.Property.LandlordUserId,
            "HoanTatThanhLy",
            "Hợp đồng đã hoàn tất thanh lý",
            $"Hợp đồng thuê phòng {ContractService.RoomLabel(contract)} đã hoàn tất thanh lý, phòng chuyển sang " +
            $"{(roomNextStatus == RoomOccupancyStatus.Trong ? "Trống" : "Bảo trì")}. " +
            SettlementOutcomeText(contract, invoice, forTenant: false),
            nameof(Contract),
            contract.Id);

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

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


    /// <summary>Hợp đồng kèm phòng, khu trọ và hóa đơn thanh lý của nó (null khi chưa lập).</summary>
    private async Task<(Contract? Contract, Invoice? Invoice)> FindSettlementInvoiceAsync(
        long id,
        CancellationToken cancellationToken)
    {
        var contract = await FindAsync(id, cancellationToken);

        if (contract is null)
        {
            return (null, null);
        }

        var invoice = await _db.Invoices.FirstOrDefaultAsync(
            i => i.ContractId == id && i.Type == InvoiceType.ThanhLy,
            cancellationToken);

        return (contract, invoice);
    }

    /// <summary>
    /// Người thuê chỉ thao tác trên bảng thanh lý của hợp đồng mình đứng tên, và chỉ thấy bảng từ khi được gửi — bảng ở
    /// Nháp coi như chưa có, trả 404 (api-design mục 10). Bảng không ở trạng thái chờ người thuê xác nhận thì 409.
    /// Trả null khi người thuê được đồng ý hoặc yêu cầu sửa.
    /// </summary>
    private static ServiceResult? TenantSettlementInvoiceError(Contract? contract, Invoice? invoice, long tenantUserId)
    {
        if (contract is null || contract.TenantUserId != tenantUserId)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, NotFoundMessage);
        }

        if (invoice is null || invoice.Status == InvoiceStatus.Nhap)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, NoSettlementInvoiceMessage);
        }

        return invoice.IsAwaitingTenantSettlementConfirmation
            ? null
            : ServiceResult.Fail(StatusCodes.Status409Conflict, "Bảng thanh lý đã khóa, không còn chờ bạn xác nhận.");
    }

    /// <summary>
    /// Chiều của số dư cho người đọc thông báo (FR-58): số dư dương là khoản người thuê phải trả, kèm hạn nếu bảng đã
    /// khóa; số dư âm là phần cọc dư Chủ trọ phải hoàn.
    /// </summary>
    private static string BalanceText(Invoice invoice, bool forTenant)
    {
        var total = invoice.TotalAmount;

        if (total > 0)
        {
            var due = invoice.DueDate is { } dueDate ? $" trước hết ngày {dueDate:dd/MM/yyyy}" : string.Empty;
            return $"{(forTenant ? "Bạn" : "Người thuê")} cần thanh toán {Money(total)}{due}.";
        }

        if (total < 0)
        {
            return forTenant
                ? $"Chủ trọ hoàn lại bạn {Money(-total)} tiền cọc còn dư."
                : $"Bạn cần hoàn lại người thuê {Money(-total)} tiền cọc còn dư khi hoàn tất thanh lý.";
        }

        return "Số dư bằng 0, không bên nào phải trả thêm.";
    }

    /// <summary>
    /// Kết quả tiền nong sau khi hoàn tất thanh lý (FR-86, FR-96): đã hoàn cọc bao nhiêu, hay người thuê còn nợ bao nhiêu
    /// trên hóa đơn thanh lý, hay không còn khoản nào.
    /// </summary>
    private static string SettlementOutcomeText(Contract contract, Invoice invoice, bool forTenant)
    {
        if (contract is { DepositRefundedAmount: { } refunded, DepositRefundedAt: { } refundedAt, DepositRefundMethod: { } method }
            && invoice.TotalAmount < 0)
        {
            var how = method == PaymentMethod.TienMat ? "tiền mặt" : "chuyển khoản";
            var day = $"{VietnamTime.DateOf(refundedAt):dd/MM/yyyy}";

            return forTenant
                ? $"Chủ trọ đã hoàn {Money(refunded)} tiền cọc còn dư ({how}) ngày {day}."
                : $"Đã ghi nhận hoàn {Money(refunded)} tiền cọc còn dư cho người thuê ({how}) ngày {day}.";
        }

        var remaining = invoice.TotalAmount - invoice.PaidAmount;

        if (remaining > 0)
        {
            var due = invoice.DueDate is { } dueDate ? $", hạn {dueDate:dd/MM/yyyy}" : string.Empty;

            return forTenant
                ? $"Bạn còn nợ {Money(remaining)} trên hóa đơn thanh lý{due}; vẫn báo thanh toán được như hóa đơn thường."
                : $"Người thuê còn nợ {Money(remaining)} trên hóa đơn thanh lý{due}; khoản này vẫn được theo dõi.";
        }

        return "Không còn khoản nào phải trả.";
    }

    /// <summary>Số tiền kiểu Việt Nam, dấu chấm ngăn hàng nghìn: 1.499.678 đồng — không phụ thuộc ngôn ngữ của máy chủ.</summary>
    private static string Money(decimal amount)
        => amount.ToString("#,0", CultureInfo.InvariantCulture).Replace(",", ".") + " đồng";

    /// <summary>Nạp thêm phí dịch vụ đã chốt trong hợp đồng để tính hóa đơn thanh lý.</summary>
    private Task<Contract?> FindForSettlementInvoiceAsync(long id, CancellationToken cancellationToken)
        => _db.Contracts
            .Include(c => c.Room)
            .ThenInclude(r => r.Property)
            .Include(c => c.ServiceFees)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

    /// <summary>
    /// Kiểm tra phần chung của lập và sửa hóa đơn thanh lý: kỳ (FR-93, 409), chỉ số (BR-14, 422), các dòng Chủ trọ gửi
    /// (tối đa <see cref="MaxSettlementLines"/> dòng; FR-55, FR-87, BR-16, BR-22 — 422) và đường dẫn ảnh (api-design mục
    /// 14 — 422). Số dòng kiểm tra trước, nên request quá nhiều dòng không tới bước gọi Storage.
    /// </summary>
    /// <param name="otherInvoices">Các hóa đơn khác của hợp đồng, không gồm hóa đơn thanh lý.</param>
    private async Task<ServiceResult<SettlementInvoiceDraft>> PrepareSettlementInvoiceAsync(
        long landlordUserId,
        Contract contract,
        IReadOnlyList<Invoice> otherInvoices,
        SettlementInvoiceRequest request,
        CancellationToken cancellationToken)
    {
        // FR-54: ngày trả phòng không được trước ngày bắt đầu hợp đồng.
        if (request.MoveOutDate!.Value < contract.StartDate)
        {
            return ServiceResult<SettlementInvoiceDraft>.Fail(
                StatusCodes.Status422UnprocessableEntity,
                $"Ngày trả phòng không được trước ngày bắt đầu hợp đồng ({contract.StartDate:dd/MM/yyyy}).");
        }

        var lastPeriodic = otherInvoices
            .Where(i => i.Type == InvoiceType.DinhKy && i.Status != InvoiceStatus.DaHuy)
            .MaxBy(i => i.PeriodEnd);

        var period = SettlementPeriod.For(
            contract.StartDate,
            lastPeriodic is null ? null : new BillingPeriod(lastPeriodic.PeriodStart, lastPeriodic.PeriodEnd),
            request.MoveOutDate!.Value);

        if (period is null)
        {
            // FR-93: tháng của ngày trả phòng dự kiến bị chặn lập hóa đơn định kỳ (FR-91), nên người thuê ở lại quá tháng
            // đó thì "lập hóa đơn còn thiếu" không làm được — đường đúng là rút thông báo rồi gửi lại (FR-98).
            return ServiceResult<SettlementInvoiceDraft>.Fail(
                StatusCodes.Status409Conflict,
                contract.IsMoveOutAfterExpectedMonth(request.MoveOutDate!.Value)
                    ? $"Người thuê ở lại quá tháng trả phòng dự kiến ({contract.ExpectedMoveOutDate:MM/yyyy}). " +
                      "Bên đã gửi thông báo rút thông báo rồi gửi lại với ngày trả phòng mới."
                    : lastPeriodic is null
                        ? "Hợp đồng chưa có hóa đơn định kỳ nên ngày trả phòng phải thuộc tháng của ngày bắt đầu hợp đồng. " +
                          "Lập trước hóa đơn định kỳ của các tháng còn thiếu."
                        : $"Ngày trả phòng phải thuộc tháng của kỳ hóa đơn định kỳ cuối cùng ({lastPeriodic.PeriodEnd:MM/yyyy}) " +
                          "hoặc tháng ngay sau đó. Lập trước hóa đơn định kỳ của các tháng còn thiếu.");
        }

        // BR-14: chỉ số cũ là chỉ số mới của hóa đơn chưa hủy gần nhất, hoặc chỉ số lúc bàn giao ghi trong hợp đồng.
        var latest = otherInvoices
            .Where(i => i.Status != InvoiceStatus.DaHuy)
            .OrderByDescending(i => i.PeriodEnd)
            .ThenByDescending(i => i.Id)
            .FirstOrDefault();

        var electricity = new MeterReading(
            latest?.CurrentElectricityIndex ?? contract.InitialElectricityIndex,
            request.CurrentElectricityIndex!.Value);
        var water = new MeterReading(
            latest?.CurrentWaterIndex ?? contract.InitialWaterIndex,
            request.CurrentWaterIndex!.Value);

        if (!electricity.IsValid || !water.IsValid)
        {
            return ServiceResult<SettlementInvoiceDraft>.Fail(
                StatusCodes.Status422UnprocessableEntity,
                $"Chỉ số mới không được nhỏ hơn chỉ số cũ (điện {electricity.Previous}, nước {water.Previous}).");
        }

        if (request.Lines is { Count: > MaxSettlementLines })
        {
            return ServiceResult<SettlementInvoiceDraft>.Fail(
                StatusCodes.Status422UnprocessableEntity,
                $"Bảng thanh lý có tối đa {MaxSettlementLines} dòng bồi thường, phí phạt và điều chỉnh.");
        }

        var landlordLines = new List<InvoiceLine>();

        foreach (var line in request.Lines ?? [])
        {
            var category = line.Category!.Value;

            if (!InvoiceLine.IsAllowedFromLandlordOnSettlement(category))
            {
                return ServiceResult<SettlementInvoiceDraft>.Fail(
                    StatusCodes.Status422UnprocessableEntity,
                    "Dòng công nợ kỳ trước và dòng trừ tiền cọc do hệ thống tự thêm. " +
                    "Chỉ gửi được dòng bồi thường hư hỏng, phí phạt và điều chỉnh.");
            }

            if (!InvoiceLine.IsAmountAllowedOnSettlement(category, line.Amount!.Value))
            {
                return ServiceResult<SettlementInvoiceDraft>.Fail(
                    StatusCodes.Status422UnprocessableEntity,
                    "Số tiền bồi thường hư hỏng và phí phạt phải lớn hơn 0. Muốn giảm thì thêm dòng điều chỉnh.");
            }

            if (string.IsNullOrWhiteSpace(line.Description))
            {
                return ServiceResult<SettlementInvoiceDraft>.Fail(
                    StatusCodes.Status422UnprocessableEntity, "Mỗi khoản phải là một dòng riêng có mô tả lý do.");
            }

            if (line.RelatedInvoiceId is { } relatedInvoiceId)
            {
                if (category != InvoiceLineCategory.DieuChinhKhac)
                {
                    return ServiceResult<SettlementInvoiceDraft>.Fail(
                        StatusCodes.Status422UnprocessableEntity,
                        "Chỉ dòng điều chỉnh mới được trỏ về một hóa đơn trước.");
                }

                if (otherInvoices.All(i => i.Id != relatedInvoiceId))
                {
                    return ServiceResult<SettlementInvoiceDraft>.Fail(
                        StatusCodes.Status422UnprocessableEntity,
                        "Hóa đơn được điều chỉnh phải là một hóa đơn trước của cùng hợp đồng.");
                }
            }

            landlordLines.Add(new InvoiceLine
            {
                Category = category,
                Description = line.Description.Trim(),
                Amount = line.Amount!.Value,
                EvidenceUrl = line.EvidencePath,
                RelatedInvoiceId = line.RelatedInvoiceId
            });
        }

        if (!SettlementCalculator.IsPenaltyAllowed(contract, landlordLines))
        {
            var totalPenalty = landlordLines.Where(l => l.Category == InvoiceLineCategory.PhiPhat).Sum(l => l.Amount);

            return ServiceResult<SettlementInvoiceDraft>.Fail(
                StatusCodes.Status422UnprocessableEntity,
                contract.IsMoveOutPenaltyAllowed
                    ? $"Tổng phí phạt {Money(totalPenalty)} vượt tiền cọc {Money(contract.DepositAmount)} của hợp đồng."
                    : "Chỉ tính phí phạt khi người thuê là bên gửi thông báo trả phòng, báo trước ít hơn " +
                      $"{Contract.MinimumMoveOutNoticeDays} ngày và trả phòng trước ngày kết thúc hợp đồng.");
        }

        if (!await AreSettlementFilesOwnedAsync(landlordUserId, request, cancellationToken))
        {
            return ServiceResult<SettlementInvoiceDraft>.Fail(
                StatusCodes.Status422UnprocessableEntity,
                "Đường dẫn ảnh không hợp lệ: chỉ nhận ảnh đồng hồ và ảnh hư hỏng do chính bạn tải lên.");
        }

        return ServiceResult<SettlementInvoiceDraft>.Ok(new SettlementInvoiceDraft(
            period,
            electricity,
            water,
            request.ElectricityMeterPhotoPath,
            request.WaterMeterPhotoPath,
            landlordLines));
    }

    /// <summary>
    /// Ảnh đồng hồ (<c>AnhDongHo</c>) và ảnh hư hỏng (<c>AnhHuHong</c>) phải do chính Chủ trọ tải lên và còn trên
    /// Storage (security-design mục 8, điều 17). Mỗi đường dẫn là một lần gọi Storage — kiểm tra song song.
    /// </summary>
    private async Task<bool> AreSettlementFilesOwnedAsync(
        long landlordUserId,
        SettlementInvoiceRequest request,
        CancellationToken cancellationToken)
    {
        var meterPhotos = new[] { request.ElectricityMeterPhotoPath, request.WaterMeterPhotoPath }
            .OfType<string>()
            .Select(path => _fileStorage.IsOwnedByAsync(path, FilePurpose.AnhDongHo, landlordUserId, cancellationToken));

        var evidencePhotos = (request.Lines ?? [])
            .Select(l => l.EvidencePath)
            .OfType<string>()
            .Select(path => _fileStorage.IsOwnedByAsync(path, FilePurpose.AnhHuHong, landlordUserId, cancellationToken));

        var owned = await Task.WhenAll(meterPhotos.Concat(evidencePhotos));

        return owned.All(isOwned => isOwned);
    }

    /// <summary>
    /// Ghi kết quả Domain đã tính — từ dòng công nợ đã kết chuyển và các dòng Chủ trọ gửi, Domain tự thêm dòng trừ tiền
    /// cọc — vào hóa đơn: danh sách dòng, kỳ, chỉ số, đơn giá đã chốt trong hợp đồng (BR-13) và các khoản tiền. Dòng cũ
    /// không còn trong kết quả bị xóa, nên tổng luôn khớp các dòng được lưu. Bên gọi kiểm tra
    /// <see cref="SettlementInvoiceAmounts.FitsMoneyColumns"/> trước khi gọi.
    /// </summary>
    private void ApplySettlementInvoice(
        Invoice invoice,
        Contract contract,
        SettlementInvoiceDraft draft,
        SettlementInvoiceCalculation calculation)
    {
        var staleLines = invoice.Lines.Where(l => !calculation.Lines.Contains(l)).ToList();

        foreach (var line in staleLines)
        {
            invoice.Lines.Remove(line);
        }

        _db.InvoiceLines.RemoveRange(staleLines.Where(l => l.Id != 0));

        foreach (var line in calculation.Lines.Where(l => !invoice.Lines.Contains(l)))
        {
            invoice.Lines.Add(line);
        }

        var amounts = calculation.Amounts;

        invoice.PeriodStart = draft.Period.Start;
        invoice.PeriodEnd = draft.Period.End;
        invoice.PreviousElectricityIndex = draft.Electricity.Previous;
        invoice.CurrentElectricityIndex = draft.Electricity.Current;
        invoice.ElectricityUnitPrice = contract.ElectricityUnitPrice;
        invoice.ElectricityAmount = amounts.ElectricityAmount;
        invoice.PreviousWaterIndex = draft.Water.Previous;
        invoice.CurrentWaterIndex = draft.Water.Current;
        invoice.WaterUnitPrice = contract.WaterUnitPrice;
        invoice.WaterAmount = amounts.WaterAmount;
        invoice.RentAmount = amounts.RentAmount;
        invoice.ServiceFeeAmount = amounts.ServiceFeeAmount;
        invoice.TotalAmount = amounts.TotalAmount;
        invoice.ElectricityMeterPhotoUrl = draft.ElectricityMeterPhotoPath;
        invoice.WaterMeterPhotoUrl = draft.WaterMeterPhotoPath;
    }

    /// <summary>
    /// Có hóa đơn thanh lý thì không rút được thông báo trả phòng (FR-98). Lập hoặc sửa hóa đơn thanh lý cũng ghi lại
    /// hợp đồng, để lệnh UPDATE kèm điều kiện xmin chạy trong cùng transaction: lệnh rút thông báo chạy song song — cũng
    /// ghi hợp đồng — sẽ có một bên nhận DbUpdateConcurrencyException (409) thay vì đưa hợp đồng về Đang hiệu lực khi đã
    /// có hóa đơn thanh lý. Chỉ khóa dòng (SELECT ... FOR UPDATE) thì không đổi xmin nên không đủ.
    /// </summary>
    private void MarkContractChanged(Contract contract)
        => _db.Entry(contract).Property(c => c.Status).IsModified = true;

    /// <summary>Kỳ, chỉ số, ảnh đồng hồ và các dòng Chủ trọ gửi đã qua kiểm tra, dùng chung cho lập và sửa.</summary>
    private sealed record SettlementInvoiceDraft(
        SettlementPeriod Period,
        MeterReading Electricity,
        MeterReading Water,
        string? ElectricityMeterPhotoPath,
        string? WaterMeterPhotoPath,
        IReadOnlyList<InvoiceLine> LandlordLines);

    /// <summary>Giá trị ghi nhật ký TaoHoaDon, SuaHoaDon (BR-23): kỳ, chỉ số, các khoản tiền và từng dòng.</summary>
    private sealed record SettlementInvoiceAudit(
        DateOnly PeriodStart,
        DateOnly PeriodEnd,
        decimal PreviousElectricityIndex,
        decimal CurrentElectricityIndex,
        decimal PreviousWaterIndex,
        decimal CurrentWaterIndex,
        decimal RentAmount,
        decimal ElectricityAmount,
        decimal WaterAmount,
        decimal ServiceFeeAmount,
        decimal TotalAmount,
        IReadOnlyList<SettlementInvoiceAuditLine> Lines)
    {
        public static SettlementInvoiceAudit Of(Invoice invoice) => new(
            invoice.PeriodStart,
            invoice.PeriodEnd,
            invoice.PreviousElectricityIndex,
            invoice.CurrentElectricityIndex,
            invoice.PreviousWaterIndex,
            invoice.CurrentWaterIndex,
            invoice.RentAmount,
            invoice.ElectricityAmount,
            invoice.WaterAmount,
            invoice.ServiceFeeAmount,
            invoice.TotalAmount,
            invoice.Lines
                .Select(l => new SettlementInvoiceAuditLine(
                    l.Category.ToString(), l.Description, l.Amount, l.EvidenceUrl, l.RelatedInvoiceId))
                .ToList());
    }

    /// <summary>Một dòng trong nhật ký hóa đơn thanh lý; loại dòng ghi bằng tên để đọc được.</summary>
    private sealed record SettlementInvoiceAuditLine(
        string Category,
        string Description,
        decimal Amount,
        string? EvidencePath,
        long? RelatedInvoiceId);
}
