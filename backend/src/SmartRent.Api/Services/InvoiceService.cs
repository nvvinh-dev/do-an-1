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
/// Hóa đơn định kỳ và thanh toán — BP-07. Chủ trọ chỉ thao tác trên hợp đồng và hóa đơn thuộc phòng của mình: quyền sở
/// hữu truy hóa đơn → hợp đồng → phòng → khu trọ → Chủ trọ, tài nguyên không thuộc người gọi trả 404 như không tồn tại.
/// Người thuê chỉ xem hóa đơn của hợp đồng mình đứng tên, và chỉ từ khi hóa đơn được phát hành hoặc gửi.
/// </summary>
public class InvoiceService
{
    private const string ContractNotFoundMessage = "Không tìm thấy hợp đồng.";

    private const string InvoiceNotFoundMessage = "Không tìm thấy hóa đơn.";

    private const string AmountTooLargeMessage =
        "Số tiền của hóa đơn quá lớn. Kiểm tra lại chỉ số điện nước và số tiền của các dòng điều chỉnh.";

    private readonly AppDbContext _db;
    private readonly AuditLogger _auditLogger;
    private readonly Notifier _notifier;
    private readonly IFileStorage _fileStorage;
    private readonly InvoiceDetailBuilder _invoiceDetailBuilder;

    public InvoiceService(
        AppDbContext db,
        AuditLogger auditLogger,
        Notifier notifier,
        IFileStorage fileStorage,
        InvoiceDetailBuilder invoiceDetailBuilder)
    {
        _db = db;
        _auditLogger = auditLogger;
        _notifier = notifier;
        _fileStorage = fileStorage;
        _invoiceDetailBuilder = invoiceDetailBuilder;
    }

    /// <summary>
    /// FR-38 tới FR-43, FR-91: Chủ trọ chốt chỉ số mới, hệ thống lập hóa đơn định kỳ ở Nháp cho kỳ kế tiếp của hợp đồng.
    /// Kỳ, chỉ số cũ, đơn giá và mọi số tiền do server tính (BR-13 tới BR-15, security-design mục 5.2). Người thuê chưa
    /// thấy hóa đơn ở Nháp nên không gửi thông báo.
    /// </summary>
    public async Task<ServiceResult<InvoiceDetailResponse>> CreatePeriodicInvoiceAsync(
        long landlordUserId,
        long contractId,
        PeriodicInvoiceRequest request,
        CancellationToken cancellationToken = default)
    {
        // Theo dõi thay đổi: lập hóa đơn ghi lại hợp đồng để đổi xmin (MarkContractChanged).
        var contract = await _db.Contracts
            .Include(c => c.ServiceFees)
            .FirstOrDefaultAsync(
                c => c.Id == contractId && c.Room.Property.LandlordUserId == landlordUserId,
                cancellationToken);

        if (contract is null)
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(StatusCodes.Status404NotFound, ContractNotFoundMessage);
        }

        var today = VietnamTime.DateOf(DateTimeOffset.UtcNow);

        if (!contract.CanCreatePeriodicInvoice(today))
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(
                StatusCodes.Status409Conflict,
                Contract.OccupyingStatuses.Contains(contract.Status)
                    ? $"Hợp đồng chưa tới ngày bắt đầu ({contract.StartDate:dd/MM/yyyy}) nên chưa lập được hóa đơn."
                    : "Chỉ lập được hóa đơn định kỳ khi hợp đồng đang hiệu lực, sắp hết hạn hoặc đang thanh lý.");
        }

        var invoices = await _db.Invoices
            .AsNoTracking()
            .Where(i => i.ContractId == contractId)
            .ToListAsync(cancellationToken);

        if (invoices.Any(i => i.Type == InvoiceType.ThanhLy))
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(
                StatusCodes.Status409Conflict,
                "Hợp đồng đã có hóa đơn thanh lý, tiền phòng đã tính tới ngày trả phòng thực tế. " +
                "Không lập thêm hóa đơn định kỳ.");
        }

        if (invoices.Any(i => i.Type == InvoiceType.DinhKy && i.Status == InvoiceStatus.Nhap))
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(
                StatusCodes.Status409Conflict,
                "Hợp đồng còn hóa đơn định kỳ ở Nháp. Phát hành, sửa hoặc hủy hóa đơn đó trước khi lập kỳ kế tiếp.");
        }

        var period = contract.NextBillingPeriod(invoices);

        if (contract.IsPeriodicInvoiceBlockedByMoveOut(period))
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(
                StatusCodes.Status409Conflict,
                $"Hợp đồng có thông báo trả phòng ngày {contract.ExpectedMoveOutDate:dd/MM/yyyy}: hóa đơn định kỳ dừng ở " +
                $"tháng trước tháng trả phòng, kỳ {period.Start:MM/yyyy} thuộc hóa đơn thanh lý.");
        }

        // Tới đây hợp đồng đã tới ngày bắt đầu, nên kỳ kế tiếp lập được từ ngày 25 của tháng đó (FR-91).
        if (!period.CanBeInvoicedOn(today))
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(
                StatusCodes.Status409Conflict,
                $"Chưa tới lúc lập hóa đơn kỳ {period.Start:dd/MM/yyyy} – {period.End:dd/MM/yyyy}: " +
                $"lập được từ ngày 25/{period.Start:MM/yyyy}.");
        }

        var prepared = await PreparePeriodicInvoiceAsync(landlordUserId, contract, invoices, request, cancellationToken);

        if (!prepared.Succeeded)
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(prepared.StatusCode, prepared.Error!);
        }

        var draft = prepared.Value!;
        var amounts = InvoiceCalculator.CalculatePeriodic(contract, period, draft.Electricity, draft.Water, draft.Lines);

        if (AmountsError(amounts) is { } amountsError)
        {
            return amountsError;
        }

        var invoice = new Invoice
        {
            ContractId = contract.Id,
            Contract = contract,
            Type = InvoiceType.DinhKy,
            Status = InvoiceStatus.Nhap,
            PeriodStart = period.Start,
            PeriodEnd = period.End
        };

        ApplyPeriodicInvoice(invoice, contract, draft, amounts);
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
            // Hai request lập cùng một kỳ gần như đồng thời: unique index BR-17 chặn bên sau.
            return ServiceResult<InvoiceDetailResponse>.Fail(
                StatusCodes.Status409Conflict,
                $"Kỳ {period.Start:dd/MM/yyyy} – {period.End:dd/MM/yyyy} đã có hóa đơn định kỳ.");
        }

        _auditLogger.Write(
            landlordUserId,
            "TaoHoaDon",
            nameof(Invoice),
            invoice.Id,
            newValue: PeriodicInvoiceAudit.Of(invoice));

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return ServiceResult<InvoiceDetailResponse>.Ok(
            await _invoiceDetailBuilder.BuildAsync(invoice, paymentQr: null, cancellationToken));
    }

    /// <summary>
    /// FR-49, FR-50, BR-16: Chủ trọ sửa hóa đơn định kỳ mới nhất của hợp đồng khi chưa thu đồng nào, body giống lúc lập;
    /// kỳ giữ nguyên, server tính lại chỉ số cũ và mọi số tiền. Hóa đơn đã phát hành có lại trọn hạn thanh toán tính từ
    /// ngày sửa, hoặc sang Đã thanh toán nếu tổng mới bằng 0, và người thuê nhận thông báo. Ghi nhật ký giá trị cũ và mới
    /// (BR-23).
    /// </summary>
    public async Task<ServiceResult<InvoiceDetailResponse>> UpdatePeriodicInvoiceAsync(
        long landlordUserId,
        long id,
        PeriodicInvoiceRequest request,
        CancellationToken cancellationToken = default)
    {
        var invoice = await _db.Invoices
            .Include(i => i.Contract)
            .ThenInclude(c => c.ServiceFees)
            .Include(i => i.Contract)
            .ThenInclude(c => c.Room)
            .ThenInclude(r => r.Property)
            .Include(i => i.Lines)
            .Include(i => i.PaymentReports)
            .AsSplitQuery()
            .FirstOrDefaultAsync(
                i => i.Id == id && i.Contract.Room.Property.LandlordUserId == landlordUserId,
                cancellationToken);

        if (invoice is null)
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(StatusCodes.Status404NotFound, InvoiceNotFoundMessage);
        }

        var contractInvoices = await LoadContractInvoicesAsync(invoice.ContractId, cancellationToken);

        if (ChangeError(invoice, contractInvoices, "sửa") is { } changeError)
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(StatusCodes.Status409Conflict, changeError);
        }

        var contract = invoice.Contract;
        var otherInvoices = contractInvoices.Where(i => i.Id != invoice.Id).ToList();
        var prepared = await PreparePeriodicInvoiceAsync(landlordUserId, contract, otherInvoices, request, cancellationToken);

        if (!prepared.Succeeded)
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(prepared.StatusCode, prepared.Error!);
        }

        var draft = prepared.Value!;
        var period = new BillingPeriod(invoice.PeriodStart, invoice.PeriodEnd);
        var amounts = InvoiceCalculator.CalculatePeriodic(contract, period, draft.Electricity, draft.Water, draft.Lines);

        if (AmountsError(amounts) is { } amountsError)
        {
            return amountsError;
        }

        var wasIssued = invoice.Status != InvoiceStatus.Nhap;
        var before = PeriodicInvoiceAudit.Of(invoice);

        ApplyPeriodicInvoice(invoice, contract, draft, amounts);
        invoice.ResetPaymentAfterEdit(DateTimeOffset.UtcNow, contract.PaymentDueDays);
        MarkContractChanged(contract);

        _auditLogger.Write(
            landlordUserId,
            "SuaHoaDon",
            nameof(Invoice),
            invoice.Id,
            before,
            PeriodicInvoiceAudit.Of(invoice));

        // Hóa đơn Nháp người thuê chưa thấy nên không thông báo.
        if (wasIssued)
        {
            _notifier.Notify(
                contract.TenantUserId,
                "HoaDonDuocSua",
                "Hóa đơn đã được sửa",
                $"Chủ trọ đã sửa hóa đơn kỳ {PeriodText(invoice)} phòng {ContractService.RoomLabel(contract)}. " +
                AmountDueText(invoice),
                nameof(Invoice),
                invoice.Id);
        }

        // Thao tác khác vừa đổi cùng hợp đồng thì DbUpdateConcurrencyException được
        // ConcurrencyConflictExceptionHandler trả 409.
        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult<InvoiceDetailResponse>.Ok(
            await _invoiceDetailBuilder.BuildAsync(invoice, paymentQr: null, cancellationToken));
    }

    /// <summary>
    /// api-design mục 9: Chủ trọ phát hành hóa đơn định kỳ ở Nháp — Chưa thanh toán với hạn tính từ ngày phát hành, hoặc
    /// Đã thanh toán ngay khi tổng bằng 0 (FR-41). Người thuê nhận thông báo mức Cao.
    /// </summary>
    public async Task<ServiceResult> IssueAsync(
        long landlordUserId,
        long id,
        CancellationToken cancellationToken = default)
    {
        var invoice = await FindOwnedAsync(landlordUserId, id, cancellationToken);

        if (invoice is null)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, InvoiceNotFoundMessage);
        }

        if (!invoice.CanIssue)
        {
            return ServiceResult.Fail(
                StatusCodes.Status409Conflict,
                invoice.Type == InvoiceType.ThanhLy
                    ? "Hóa đơn thanh lý không phát hành ở đây: gửi bảng thanh lý cho người thuê xác nhận."
                    : "Chỉ phát hành được hóa đơn đang ở Nháp.");
        }

        var contract = invoice.Contract;
        invoice.Issue(DateTimeOffset.UtcNow, contract.PaymentDueDays);
        MarkContractChanged(contract);

        _notifier.Notify(
            contract.TenantUserId,
            "HoaDonMoi",
            "Hóa đơn mới",
            $"Chủ trọ đã phát hành hóa đơn kỳ {PeriodText(invoice)} phòng {ContractService.RoomLabel(contract)}. " +
            AmountDueText(invoice),
            nameof(Invoice),
            invoice.Id);

        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    /// <summary>
    /// FR-52: Chủ trọ hủy hóa đơn định kỳ mới nhất của hợp đồng khi chưa thu đồng nào, lý do bắt buộc. Ghi nhật ký
    /// (BR-23); hóa đơn đã phát hành thì người thuê nhận thông báo — hủy hóa đơn Nháp thì không, vì người thuê chưa thấy.
    /// </summary>
    public async Task<ServiceResult> CancelAsync(
        long landlordUserId,
        long id,
        string reason,
        CancellationToken cancellationToken = default)
    {
        var invoice = await FindOwnedAsync(landlordUserId, id, cancellationToken);

        if (invoice is null)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, InvoiceNotFoundMessage);
        }

        var contractInvoices = await LoadContractInvoicesAsync(invoice.ContractId, cancellationToken);

        if (ChangeError(invoice, contractInvoices, "hủy") is { } changeError)
        {
            return ServiceResult.Fail(StatusCodes.Status409Conflict, changeError);
        }

        var contract = invoice.Contract;
        var wasIssued = invoice.Status != InvoiceStatus.Nhap;
        var before = new { Status = invoice.Status.ToString(), invoice.TotalAmount, invoice.DueDate };
        var trimmedReason = reason.Trim();

        invoice.Cancel(trimmedReason);
        MarkContractChanged(contract);

        _auditLogger.Write(
            landlordUserId,
            "HuyHoaDon",
            nameof(Invoice),
            invoice.Id,
            before,
            new { Status = invoice.Status.ToString(), CancelReason = trimmedReason });

        if (wasIssued)
        {
            _notifier.Notify(
                contract.TenantUserId,
                "HoaDonBiHuy",
                "Hóa đơn bị hủy",
                $"Chủ trọ đã hủy hóa đơn kỳ {PeriodText(invoice)} phòng {ContractService.RoomLabel(contract)}. " +
                $"Lý do: {trimmedReason}",
                nameof(Invoice),
                invoice.Id);
        }

        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    /// <summary>
    /// FR-45, BR-06b: người thuê đứng tên báo đã thanh toán kèm minh chứng do chính mình tải lên, khi hóa đơn ở Chưa thanh
    /// toán, Thanh toán một phần hoặc Quá hạn; hóa đơn sang Chờ xác nhận và Chủ trọ nhận thông báo. Hóa đơn người thuê
    /// chưa thấy trả 404 như không tồn tại.
    /// </summary>
    public async Task<ServiceResult<PaymentReportResponse>> ReportPaymentAsync(
        long tenantUserId,
        long id,
        ReportPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        var invoice = await _db.Invoices
            .Include(i => i.Contract)
            .ThenInclude(c => c.Room)
            .ThenInclude(r => r.Property)
            .FirstOrDefaultAsync(i => i.Id == id && i.Contract.TenantUserId == tenantUserId, cancellationToken);

        if (invoice is null || !invoice.IsVisibleToTenant)
        {
            return ServiceResult<PaymentReportResponse>.Fail(StatusCodes.Status404NotFound, InvoiceNotFoundMessage);
        }

        if (!invoice.CanReportPayment)
        {
            return ServiceResult<PaymentReportResponse>.Fail(
                StatusCodes.Status409Conflict,
                invoice.Status switch
                {
                    InvoiceStatus.ChoXacNhan => "Hóa đơn đang có lượt báo thanh toán chờ Chủ trọ xác nhận.",
                    InvoiceStatus.DaThanhToan => "Hóa đơn đã thanh toán xong.",
                    InvoiceStatus.DaChuyenThanhLy =>
                        "Hóa đơn đã chuyển vào hóa đơn thanh lý. Báo thanh toán trên hóa đơn thanh lý.",
                    _ => "Chỉ báo thanh toán được khi hóa đơn ở Chưa thanh toán, Thanh toán một phần hoặc Quá hạn."
                });
        }

        var amount = request.ReportedAmount!.Value;

        if (!invoice.IsValidPaymentAmount(amount))
        {
            return ServiceResult<PaymentReportResponse>.Fail(
                StatusCodes.Status422UnprocessableEntity,
                $"Số tiền báo đã trả phải lớn hơn 0 và không vượt phần còn phải trả ({Money(invoice.RemainingAmount)}).");
        }

        var proofImagePath = request.ProofImagePath!;

        if (!await _fileStorage.IsOwnedByAsync(
                proofImagePath, FilePurpose.MinhChungThanhToan, tenantUserId, cancellationToken))
        {
            return ServiceResult<PaymentReportResponse>.Fail(
                StatusCodes.Status422UnprocessableEntity,
                "Đường dẫn minh chứng không hợp lệ: chỉ nhận minh chứng thanh toán do chính bạn tải lên.");
        }

        var contract = invoice.Contract;
        var report = invoice.ReportPayment(amount, proofImagePath, DateTimeOffset.UtcNow);

        _notifier.Notify(
            contract.Room.Property.LandlordUserId,
            "BaoDaThanhToan",
            "Người thuê báo đã thanh toán",
            $"Người thuê phòng {ContractService.RoomLabel(contract)} báo đã thanh toán {Money(amount)} cho hóa đơn kỳ " +
            $"{PeriodText(invoice)}. Đối soát minh chứng rồi xác nhận hoặc từ chối.",
            nameof(Invoice),
            invoice.Id);

        // Chủ trọ lập bảng thanh lý kết chuyển chính hóa đơn này, hoặc một lượt báo khác, cùng lúc: xmin của hóa đơn
        // chặn bên lưu sau, ConcurrencyConflictExceptionHandler trả 409.
        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult<PaymentReportResponse>.Ok(
            await _invoiceDetailBuilder.BuildPaymentReportAsync(report, cancellationToken));
    }

    /// <summary>
    /// FR-46, FR-47, BR-06b: chỉ Chủ trọ sở hữu phòng xác nhận số tiền thực thu của một lượt báo đang chờ; số này cộng vào
    /// số đã thu. Đủ tổng thì Đã thanh toán; còn thiếu thì Quá hạn nếu đã qua hạn, ngược lại Thanh toán một phần. Ghi nhật
    /// ký (BR-23), người thuê nhận thông báo.
    /// </summary>
    public async Task<ServiceResult> ConfirmPaymentAsync(
        long landlordUserId,
        long id,
        long reportId,
        decimal confirmedAmount,
        CancellationToken cancellationToken = default)
    {
        var found = await FindPendingPaymentReportAsync(landlordUserId, id, reportId, cancellationToken);

        if (!found.Succeeded)
        {
            return ServiceResult.Fail(found.StatusCode, found.Error!);
        }

        var (invoice, report) = found.Value!;

        if (!invoice.IsValidPaymentAmount(confirmedAmount))
        {
            return ServiceResult.Fail(
                StatusCodes.Status422UnprocessableEntity,
                $"Số tiền xác nhận phải lớn hơn 0 và không vượt phần còn phải trả ({Money(invoice.RemainingAmount)}).");
        }

        var contract = invoice.Contract;
        var before = new { Status = invoice.Status.ToString(), invoice.PaidAmount };

        invoice.ConfirmPayment(report, confirmedAmount, landlordUserId, DateTimeOffset.UtcNow);

        _auditLogger.Write(
            landlordUserId,
            "XacNhanThanhToan",
            nameof(Invoice),
            invoice.Id,
            before,
            new
            {
                Status = invoice.Status.ToString(),
                invoice.PaidAmount,
                PaymentReportId = report.Id,
                report.ReportedAmount,
                report.ConfirmedAmount
            });

        _notifier.Notify(
            contract.TenantUserId,
            "ThanhToanDuocXacNhan",
            "Thanh toán được xác nhận",
            $"Chủ trọ đã xác nhận thu {Money(confirmedAmount)} cho hóa đơn kỳ {PeriodText(invoice)} phòng " +
            $"{ContractService.RoomLabel(contract)}. {BalanceText(invoice)}",
            nameof(Invoice),
            invoice.Id);

        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    /// <summary>
    /// FR-48: Chủ trọ sở hữu phòng từ chối xác nhận một lượt báo đang chờ, lý do bắt buộc. Hóa đơn về Quá hạn nếu đã qua
    /// hạn; ngược lại về Thanh toán một phần nếu đã thu được một phần, còn lại về Chưa thanh toán. Ghi nhật ký (BR-23),
    /// người thuê nhận thông báo kèm lý do.
    /// </summary>
    public async Task<ServiceResult> RejectPaymentAsync(
        long landlordUserId,
        long id,
        long reportId,
        string reason,
        CancellationToken cancellationToken = default)
    {
        var found = await FindPendingPaymentReportAsync(landlordUserId, id, reportId, cancellationToken);

        if (!found.Succeeded)
        {
            return ServiceResult.Fail(found.StatusCode, found.Error!);
        }

        var (invoice, report) = found.Value!;
        var contract = invoice.Contract;
        var before = new { Status = invoice.Status.ToString() };
        var trimmedReason = reason.Trim();

        invoice.RejectPayment(report, trimmedReason, DateTimeOffset.UtcNow);

        _auditLogger.Write(
            landlordUserId,
            "TuChoiThanhToan",
            nameof(Invoice),
            invoice.Id,
            before,
            new
            {
                Status = invoice.Status.ToString(),
                PaymentReportId = report.Id,
                report.ReportedAmount,
                RejectReason = trimmedReason
            });

        _notifier.Notify(
            contract.TenantUserId,
            "ThanhToanBiTuChoi",
            "Thanh toán bị từ chối xác nhận",
            $"Chủ trọ chưa xác nhận khoản {Money(report.ReportedAmount)} bạn báo đã trả cho hóa đơn kỳ " +
            $"{PeriodText(invoice)} phòng {ContractService.RoomLabel(contract)}. Lý do: {trimmedReason}. " +
            BalanceText(invoice),
            nameof(Invoice),
            invoice.Id);

        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    /// <summary>
    /// Tác vụ định kỳ — FR-51, FR-96: hóa đơn Chưa thanh toán hoặc Thanh toán một phần đã sang ngày sau hạn thanh toán (giờ
    /// Việt Nam) chuyển Quá hạn, hai bên nhận thông báo mức Cao — gồm cả hóa đơn thanh lý còn nợ sau khi hợp đồng hoàn tất
    /// thanh lý. Chỉ chọn hóa đơn chưa ở Quá hạn nên chạy lại không gửi trùng. Không ghi nhật ký: gắn cờ không thuộc BR-23
    /// (database-design mục 7.2).
    /// </summary>
    /// <returns>Số hóa đơn đã gắn cờ.</returns>
    public async Task<int> MarkOverdueAsync(DateTimeOffset now, CancellationToken cancellationToken = default)
    {
        var today = VietnamTime.DateOf(now);

        var ids = await _db.Invoices
            .Where(i => Invoice.OverdueMarkableStatuses.Contains(i.Status) && i.DueDate < today)
            .Select(i => i.Id)
            .ToListAsync(cancellationToken);

        var marked = 0;

        foreach (var id in ids)
        {
            _db.ChangeTracker.Clear();

            var invoice = await _db.Invoices
                .Include(i => i.Contract)
                .ThenInclude(c => c.Room)
                .ThenInclude(r => r.Property)
                .FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

            if (invoice is null || !invoice.ShouldMarkOverdue(now))
            {
                continue;
            }

            var contract = invoice.Contract;
            invoice.MarkOverdue(now);

            foreach (var recipient in new[] { contract.TenantUserId, contract.Room.Property.LandlordUserId })
            {
                _notifier.Notify(
                    recipient,
                    "HoaDonQuaHan",
                    "Hóa đơn quá hạn",
                    $"{InvoiceLabel(invoice)} phòng {ContractService.RoomLabel(contract)} đã quá hạn thanh toán (hạn ngày " +
                    $"{invoice.DueDate:dd/MM/yyyy}). Còn phải trả {Money(invoice.RemainingAmount)}.",
                    nameof(Invoice),
                    invoice.Id);
            }

            try
            {
                await _db.SaveChangesAsync(cancellationToken);
                marked++;
            }
            catch (DbUpdateConcurrencyException)
            {
                // Hóa đơn vừa được báo thanh toán, sửa hoặc kết chuyển cùng lúc (xmin): lượt chạy sau xét lại.
            }
        }

        return marked;
    }

    /// <summary>
    /// FR-44, FR-78: chi tiết hóa đơn cho người thuê đứng tên hoặc Chủ trọ sở hữu phòng; người khác, và người thuê với hóa
    /// đơn chưa phát hành, nhận 404. Mã VietQR chỉ dành cho người thuê, khi hóa đơn còn phải trả và Chủ trọ đã khai báo
    /// tài khoản nhận tiền; số tiền và nội dung chuyển khoản do server tính (mục 9.1).
    /// </summary>
    public async Task<ServiceResult<InvoiceDetailResponse>> GetDetailAsync(
        long userId,
        long id,
        CancellationToken cancellationToken = default)
    {
        var invoice = await _db.Invoices
            .AsNoTracking()
            .Include(i => i.Contract)
            .ThenInclude(c => c.ServiceFees)
            .Include(i => i.Contract)
            .ThenInclude(c => c.Room)
            .ThenInclude(r => r.Property)
            .Include(i => i.Lines)
            .Include(i => i.PaymentReports)
            .AsSplitQuery()
            .FirstOrDefaultAsync(
                i => i.Id == id
                     && (i.Contract.TenantUserId == userId || i.Contract.Room.Property.LandlordUserId == userId),
                cancellationToken);

        var viewerIsTenant = invoice?.Contract.TenantUserId == userId;

        if (invoice is null || (viewerIsTenant && !invoice.IsVisibleToTenant))
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(StatusCodes.Status404NotFound, InvoiceNotFoundMessage);
        }

        PaymentQrResponse? paymentQr = null;

        if (viewerIsTenant && invoice.IsAwaitingPayment)
        {
            var landlord = await _db.Users
                .AsNoTracking()
                .Where(u => u.Id == invoice.Contract.Room.Property.LandlordUserId)
                .Select(u => new { u.BankBin, u.BankAccountNumber, u.BankAccountName })
                .FirstAsync(cancellationToken);

            if (landlord is { BankBin: { } bankBin, BankAccountNumber: { } accountNumber, BankAccountName: { } accountName })
            {
                paymentQr = new PaymentQrResponse(
                    bankBin, accountNumber, accountName, invoice.RemainingAmount, $"SMARTRENT HD{invoice.Id}");
            }
        }

        return ServiceResult<InvoiceDetailResponse>.Ok(
            await _invoiceDetailBuilder.BuildAsync(invoice, paymentQr, cancellationToken));
    }

    /// <summary>
    /// Hóa đơn của một hợp đồng, kỳ mới trước, không phân trang — cho người thuê đứng tên hoặc Chủ trọ sở hữu phòng, người
    /// khác nhận 404. Người thuê không thấy hóa đơn chưa phát hành.
    /// </summary>
    public async Task<ServiceResult<IReadOnlyList<ContractInvoiceListItemResponse>>> ListByContractAsync(
        long userId,
        long contractId,
        CancellationToken cancellationToken = default)
    {
        var parties = await _db.Contracts
            .AsNoTracking()
            .Where(c => c.Id == contractId)
            .Select(c => new { c.TenantUserId, c.Room.Property.LandlordUserId })
            .FirstOrDefaultAsync(cancellationToken);

        if (parties is null || (parties.TenantUserId != userId && parties.LandlordUserId != userId))
        {
            return ServiceResult<IReadOnlyList<ContractInvoiceListItemResponse>>.Fail(
                StatusCodes.Status404NotFound, ContractNotFoundMessage);
        }

        var query = _db.Invoices.AsNoTracking().Where(i => i.ContractId == contractId);

        if (parties.TenantUserId == userId)
        {
            query = WhereVisibleToTenant(query);
        }

        var items = await OrderNewestFirst(query)
            .Select(i => new ContractInvoiceListItemResponse(
                i.Id,
                i.Type,
                i.PeriodStart,
                i.PeriodEnd,
                i.TotalAmount,
                i.PaidAmount,
                i.Status,
                i.IssuedAt,
                i.DueDate))
            .ToListAsync(cancellationToken);

        return ServiceResult<IReadOnlyList<ContractInvoiceListItemResponse>>.Ok(items);
    }

    /// <summary>
    /// FR-103: Chủ trọ thấy hóa đơn trên các khu trọ của mình, Người thuê thấy hóa đơn đã phát hành của các hợp đồng mình
    /// đứng tên. Lọc theo trạng thái, tháng của ngày đầu kỳ, loại hóa đơn; khu trọ và phòng chỉ dành cho Chủ trọ.
    /// </summary>
    public async Task<PagedResponse<InvoiceListItemResponse>> ListAsync(
        long userId,
        bool asLandlord,
        InvoiceListFilter filter,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _db.Invoices.AsNoTracking();

        query = asLandlord
            ? query.Where(i => i.Contract.Room.Property.LandlordUserId == userId)
            : WhereVisibleToTenant(query.Where(i => i.Contract.TenantUserId == userId));

        if (filter.Status is { Length: > 0 } statuses)
        {
            query = query.Where(i => statuses.Contains(i.Status));
        }

        if (filter.Month is { } month && InvoiceListFilter.TryParseMonth(month, out var firstDay))
        {
            var nextMonth = firstDay.AddMonths(1);
            query = query.Where(i => i.PeriodStart >= firstDay && i.PeriodStart < nextMonth);
        }

        // Lọc theo khu trọ và phòng chỉ dành cho Chủ trọ.
        if (asLandlord && filter.PropertyId is { } propertyId)
        {
            query = query.Where(i => i.Contract.Room.PropertyId == propertyId);
        }

        if (asLandlord && filter.RoomId is { } roomId)
        {
            query = query.Where(i => i.Contract.RoomId == roomId);
        }

        if (filter.Type is { } type)
        {
            query = query.Where(i => i.Type == type);
        }

        var total = await query.CountAsync(cancellationToken);

        var items = await OrderNewestFirst(query)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new InvoiceListItemResponse(
                i.Id,
                i.ContractId,
                i.Contract.Room.Code,
                i.Contract.Room.Property.Name,
                _db.Users.Where(u => u.Id == i.Contract.TenantUserId).Select(u => u.FullName).FirstOrDefault()
                    ?? string.Empty,
                i.Type,
                i.PeriodStart,
                i.PeriodEnd,
                i.TotalAmount,
                i.PaidAmount,
                i.Status,
                i.IssuedAt,
                i.DueDate))
            .ToListAsync(cancellationToken);

        return new PagedResponse<InvoiceListItemResponse>(
            items, page, pageSize, total, (int)Math.Ceiling(total / (double)pageSize));
    }

    /// <summary>
    /// FR-38: chỉ số cũ của hóa đơn kỳ kế tiếp, để màn chốt số hiện cho Chủ trọ. Chỉ để hiển thị — lập hóa đơn thì server
    /// tự tính lại bằng cùng quy tắc, không nhận chỉ số cũ từ client (security-design mục 5.2).
    /// </summary>
    public async Task<ServiceResult<MeterReadingsResponse>> GetLatestMeterReadingsAsync(
        long landlordUserId,
        long contractId,
        CancellationToken cancellationToken = default)
    {
        var contract = await _db.Contracts
            .AsNoTracking()
            .Include(c => c.Invoices.Where(i => i.Status != InvoiceStatus.DaHuy))
            .FirstOrDefaultAsync(
                c => c.Id == contractId && c.Room.Property.LandlordUserId == landlordUserId,
                cancellationToken);

        if (contract is null)
        {
            return ServiceResult<MeterReadingsResponse>.Fail(StatusCodes.Status404NotFound, ContractNotFoundMessage);
        }

        var (electricity, water) = contract.LatestMeterIndexes(contract.Invoices);

        return ServiceResult<MeterReadingsResponse>.Ok(new MeterReadingsResponse(electricity, water));
    }

    /// <summary>
    /// Người thuê thấy hóa đơn định kỳ từ khi phát hành, hóa đơn thanh lý từ lần gửi đầu — kể cả khi bảng quay về Nháp
    /// sau khi người thuê yêu cầu sửa (api-design mục 9, FR-103). Cùng điều kiện với
    /// <see cref="Invoice.IsVisibleToTenant"/> (dùng ở chi tiết hóa đơn) — đổi quy tắc thì sửa cả hai.
    /// </summary>
    private static IQueryable<Invoice> WhereVisibleToTenant(IQueryable<Invoice> invoices)
        => invoices.Where(i => i.Type == InvoiceType.ThanhLy
            ? i.SentAt != null
            : i.Status != InvoiceStatus.Nhap && (i.Status != InvoiceStatus.DaHuy || i.IssuedAt != null));

    /// <summary>
    /// Kỳ mới trước: theo ngày đầu kỳ giảm dần, cùng ngày đầu kỳ thì hóa đơn lập sau đứng trước — hóa đơn thanh lý nằm
    /// trong tháng đã có hóa đơn định kỳ (FR-93) vẫn đứng đầu (api-design mục 9).
    /// </summary>
    private static IQueryable<Invoice> OrderNewestFirst(IQueryable<Invoice> invoices)
        => invoices.OrderByDescending(i => i.PeriodStart).ThenByDescending(i => i.Id);

    /// <summary>Hóa đơn thuộc phòng của Chủ trọ, kèm hợp đồng, phòng và khu trọ để ghi nội dung thông báo.</summary>
    private Task<Invoice?> FindOwnedAsync(long landlordUserId, long id, CancellationToken cancellationToken)
        => _db.Invoices
            .Include(i => i.Contract)
            .ThenInclude(c => c.Room)
            .ThenInclude(r => r.Property)
            .FirstOrDefaultAsync(
                i => i.Id == id && i.Contract.Room.Property.LandlordUserId == landlordUserId,
                cancellationToken);

    /// <summary>
    /// Lượt báo thanh toán Chủ trọ sắp xác nhận hoặc từ chối: hóa đơn thuộc phòng của Chủ trọ và lượt báo thuộc hóa đơn
    /// đó, không thì 404; lượt báo đã được xử lý thì 409.
    /// </summary>
    private async Task<ServiceResult<PendingPaymentReport>> FindPendingPaymentReportAsync(
        long landlordUserId,
        long id,
        long reportId,
        CancellationToken cancellationToken)
    {
        var invoice = await _db.Invoices
            .Include(i => i.Contract)
            .ThenInclude(c => c.Room)
            .ThenInclude(r => r.Property)
            .Include(i => i.PaymentReports)
            .AsSplitQuery()
            .FirstOrDefaultAsync(
                i => i.Id == id && i.Contract.Room.Property.LandlordUserId == landlordUserId,
                cancellationToken);

        if (invoice is null)
        {
            return ServiceResult<PendingPaymentReport>.Fail(StatusCodes.Status404NotFound, InvoiceNotFoundMessage);
        }

        var report = invoice.PaymentReports.FirstOrDefault(p => p.Id == reportId);

        if (report is null)
        {
            return ServiceResult<PendingPaymentReport>.Fail(
                StatusCodes.Status404NotFound, "Không tìm thấy lượt báo thanh toán.");
        }

        return invoice.CanProcessPaymentReport(report)
            ? ServiceResult<PendingPaymentReport>.Ok(new PendingPaymentReport(invoice, report))
            : ServiceResult<PendingPaymentReport>.Fail(
                StatusCodes.Status409Conflict,
                report.Status == PaymentReportStatus.DaXacNhan
                    ? "Lượt báo thanh toán này đã được xác nhận."
                    : "Lượt báo thanh toán này đã bị từ chối.");
    }

    /// <summary>Mọi hóa đơn của hợp đồng, chỉ đọc — tìm hóa đơn định kỳ mới nhất, tính chỉ số cũ.</summary>
    private Task<List<Invoice>> LoadContractInvoicesAsync(long contractId, CancellationToken cancellationToken)
        => _db.Invoices
            .AsNoTracking()
            .Where(i => i.ContractId == contractId)
            .ToListAsync(cancellationToken);

    /// <summary>
    /// FR-49, FR-52, BR-16: lý do hóa đơn không sửa hoặc hủy được (409), null khi được. Chỉ hóa đơn định kỳ mới nhất chưa
    /// hủy của hợp đồng, ở Nháp, Chưa thanh toán hoặc Quá hạn và chưa thu đồng nào.
    /// </summary>
    /// <param name="action">"sửa" hoặc "hủy", để ghép câu báo lỗi.</param>
    private static string? ChangeError(Invoice invoice, IReadOnlyList<Invoice> contractInvoices, string action)
    {
        if (!invoice.CanBeEditedOrCancelled)
        {
            return invoice.Type == InvoiceType.ThanhLy
                ? action == "sửa"
                    ? "Hóa đơn thanh lý sửa bằng chức năng sửa bảng thanh lý, khi bảng còn ở Nháp."
                    : "Hóa đơn thanh lý không hủy được."
                : invoice.Status switch
                {
                    InvoiceStatus.DaHuy => "Hóa đơn đã hủy.",
                    // Hóa đơn tổng 0 sang Đã thanh toán ngay khi phát hành (FR-41) mà chưa ai trả đồng nào.
                    InvoiceStatus.DaThanhToan when invoice.PaidAmount == 0 =>
                        $"Hóa đơn tổng 0 đồng đã ở Đã thanh toán nên không {action} được. Cần thu thêm thì thêm một dòng " +
                        "điều chỉnh ở hóa đơn kỳ kế tiếp.",
                    InvoiceStatus.DaChuyenThanhLy => $"Hóa đơn đã chuyển vào hóa đơn thanh lý nên không {action} được.",
                    InvoiceStatus.ChoXacNhan =>
                        $"Hóa đơn có lượt báo thanh toán chờ xác nhận. Xác nhận hoặc từ chối trước khi {action}.",
                    _ => $"Hóa đơn đã thu tiền nên không {action} được. Sai sót điều chỉnh bằng một dòng điều chỉnh " +
                         "ở hóa đơn kỳ kế tiếp hoặc hóa đơn thanh lý."
                };
        }

        return invoice.Contract.LatestPeriodicInvoice(contractInvoices)?.Id == invoice.Id
            ? null
            : $"Chỉ {action} được hóa đơn định kỳ mới nhất của hợp đồng. Sai sót ở hóa đơn cũ hơn điều chỉnh bằng một " +
              "dòng điều chỉnh ở hóa đơn kỳ kế tiếp.";
    }

    /// <summary>422 khi số tiền tính ra vượt cột tiền, hoặc tổng hóa đơn định kỳ âm (FR-41); null khi hợp lệ.</summary>
    private static ServiceResult<InvoiceDetailResponse>? AmountsError(PeriodicInvoiceAmounts amounts)
    {
        if (!amounts.FitsMoneyColumns)
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(
                StatusCodes.Status422UnprocessableEntity, AmountTooLargeMessage);
        }

        return amounts.IsTotalAllowed
            ? null
            : ServiceResult<InvoiceDetailResponse>.Fail(
                StatusCodes.Status422UnprocessableEntity,
                "Tổng hóa đơn định kỳ không được âm. Khoản giảm lớn hơn tiền tháng thì chia sang các kỳ sau.");
    }

    /// <summary>
    /// Kiểm tra phần body của lập và sửa hóa đơn định kỳ, đều trả 422: các dòng điều chỉnh (FR-41, BR-16), chỉ số mới
    /// (BR-14, FR-39) và đường dẫn ảnh đồng hồ (api-design mục 14). Ảnh kiểm tra sau cùng vì mỗi ảnh là một lần gọi
    /// Storage.
    /// </summary>
    /// <param name="otherInvoices">Các hóa đơn khác của hợp đồng — tính chỉ số cũ và đối chiếu hóa đơn được điều chỉnh.</param>
    private async Task<ServiceResult<PeriodicInvoiceDraft>> PreparePeriodicInvoiceAsync(
        long landlordUserId,
        Contract contract,
        IReadOnlyList<Invoice> otherInvoices,
        PeriodicInvoiceRequest request,
        CancellationToken cancellationToken)
    {
        var lines = new List<InvoiceLine>();

        foreach (var line in request.AdjustmentLines ?? [])
        {
            if (!InvoiceLine.IsAllowedOnPeriodicInvoice(line.Category!.Value))
            {
                return ServiceResult<PeriodicInvoiceDraft>.Fail(
                    StatusCodes.Status422UnprocessableEntity,
                    "Hóa đơn định kỳ chỉ nhận dòng điều chỉnh (DieuChinhKhac). " +
                    "Bồi thường, phí phạt và công nợ thuộc hóa đơn thanh lý.");
            }

            if (string.IsNullOrWhiteSpace(line.Description))
            {
                return ServiceResult<PeriodicInvoiceDraft>.Fail(
                    StatusCodes.Status422UnprocessableEntity, "Mỗi khoản điều chỉnh phải là một dòng riêng có mô tả lý do.");
            }

            if (line.RelatedInvoiceId is { } relatedInvoiceId && otherInvoices.All(i => i.Id != relatedInvoiceId))
            {
                return ServiceResult<PeriodicInvoiceDraft>.Fail(
                    StatusCodes.Status422UnprocessableEntity,
                    "Hóa đơn được điều chỉnh phải là một hóa đơn trước của cùng hợp đồng.");
            }

            lines.Add(new InvoiceLine
            {
                Category = InvoiceLineCategory.DieuChinhKhac,
                Description = line.Description.Trim(),
                Amount = line.Amount!.Value,
                RelatedInvoiceId = line.RelatedInvoiceId
            });
        }

        // BR-14, FR-38: chỉ số cũ do hệ thống tự điền, không nhận từ client.
        var (previousElectricity, previousWater) = contract.LatestMeterIndexes(otherInvoices);
        var electricity = new MeterReading(previousElectricity, request.CurrentElectricityIndex!.Value);
        var water = new MeterReading(previousWater, request.CurrentWaterIndex!.Value);

        if (!electricity.IsValid || !water.IsValid)
        {
            return ServiceResult<PeriodicInvoiceDraft>.Fail(
                StatusCodes.Status422UnprocessableEntity,
                $"Chỉ số mới không được nhỏ hơn chỉ số cũ (điện {electricity.Previous}, nước {water.Previous}).");
        }

        if (!await AreMeterPhotosOwnedAsync(landlordUserId, request, cancellationToken))
        {
            return ServiceResult<PeriodicInvoiceDraft>.Fail(
                StatusCodes.Status422UnprocessableEntity,
                "Đường dẫn ảnh không hợp lệ: chỉ nhận ảnh đồng hồ do chính bạn tải lên.");
        }

        return ServiceResult<PeriodicInvoiceDraft>.Ok(new PeriodicInvoiceDraft(
            electricity,
            water,
            request.ElectricityMeterPhotoPath,
            request.WaterMeterPhotoPath,
            lines));
    }

    /// <summary>
    /// Ảnh đồng hồ (<c>AnhDongHo</c>) phải do chính Chủ trọ tải lên và còn trên Storage (security-design mục 8, điều 17).
    /// Hai ảnh là hai lần gọi Storage — kiểm tra song song.
    /// </summary>
    private async Task<bool> AreMeterPhotosOwnedAsync(
        long landlordUserId,
        PeriodicInvoiceRequest request,
        CancellationToken cancellationToken)
    {
        var owned = await Task.WhenAll(new[] { request.ElectricityMeterPhotoPath, request.WaterMeterPhotoPath }
            .OfType<string>()
            .Select(path => _fileStorage.IsOwnedByAsync(path, FilePurpose.AnhDongHo, landlordUserId, cancellationToken)));

        return owned.All(isOwned => isOwned);
    }

    /// <summary>
    /// Ghi kết quả đã kiểm tra và đã tính vào hóa đơn: chỉ số, đơn giá đã chốt trong hợp đồng (BR-13), các khoản tiền, ảnh
    /// đồng hồ và các dòng điều chỉnh. Hóa đơn định kỳ chỉ có dòng điều chỉnh do Chủ trọ gửi, nên khi sửa thì thay toàn
    /// bộ dòng cũ. Bên gọi kiểm tra <see cref="AmountsError"/> trước khi gọi.
    /// </summary>
    private void ApplyPeriodicInvoice(
        Invoice invoice,
        Contract contract,
        PeriodicInvoiceDraft draft,
        PeriodicInvoiceAmounts amounts)
    {
        var staleLines = invoice.Lines.ToList();
        invoice.Lines.Clear();
        _db.InvoiceLines.RemoveRange(staleLines);

        foreach (var line in draft.Lines)
        {
            invoice.Lines.Add(line);
        }

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
    /// Lập, sửa, phát hành và hủy hóa đơn định kỳ đều ghi lại hợp đồng, để lệnh UPDATE kèm điều kiện xmin chạy trong
    /// cùng transaction: lập bảng thanh lý chạy song song — cũng ghi hợp đồng, không lập khi còn hóa đơn định kỳ ở Nháp,
    /// và kết chuyển công nợ theo số tiền của từng hóa đơn — sẽ có một bên nhận DbUpdateConcurrencyException (409), thay
    /// vì kết chuyển một số tiền vừa bị sửa, một hóa đơn vừa bị hủy, hoặc lập thêm hóa đơn định kỳ sau hóa đơn thanh lý
    /// (FR-91, FR-92). Chỉ khóa dòng (SELECT ... FOR UPDATE) thì không đổi xmin nên không đủ.
    /// </summary>
    private void MarkContractChanged(Contract contract)
        => _db.Entry(contract).Property(c => c.Status).IsModified = true;

    private static string PeriodText(Invoice invoice) => $"{invoice.PeriodStart:dd/MM/yyyy} – {invoice.PeriodEnd:dd/MM/yyyy}";

    /// <summary>Tên hóa đơn ở đầu câu thông báo: hóa đơn thanh lý không gọi theo kỳ.</summary>
    private static string InvoiceLabel(Invoice invoice)
        => invoice.Type == InvoiceType.ThanhLy ? "Hóa đơn thanh lý" : $"Hóa đơn kỳ {PeriodText(invoice)}";

    /// <summary>Số tiền phải trả và hạn của hóa đơn vừa phát hành hoặc vừa sửa, cho thông báo gửi người thuê.</summary>
    private static string AmountDueText(Invoice invoice)
        => invoice.Status == InvoiceStatus.DaThanhToan
            ? "Tổng 0 đồng, bạn không phải thanh toán."
            : $"Tổng {Money(invoice.TotalAmount)}, hạn thanh toán hết ngày {invoice.DueDate:dd/MM/yyyy}.";

    /// <summary>
    /// Phần còn phải trả sau khi Chủ trọ xác nhận hoặc từ chối, cho thông báo gửi người thuê. Hóa đơn quá hạn trong lúc chờ
    /// xác nhận sang thẳng Quá hạn, không qua tác vụ gắn cờ quá hạn, nên câu này nói luôn hóa đơn đã quá hạn.
    /// </summary>
    private static string BalanceText(Invoice invoice)
        => invoice.Status switch
        {
            InvoiceStatus.DaThanhToan => "Hóa đơn đã thanh toán xong.",
            InvoiceStatus.QuaHan =>
                $"Còn phải trả {Money(invoice.RemainingAmount)}, hóa đơn đã quá hạn thanh toán " +
                $"(hạn ngày {invoice.DueDate:dd/MM/yyyy}).",
            _ => $"Còn phải trả {Money(invoice.RemainingAmount)}, hạn thanh toán hết ngày {invoice.DueDate:dd/MM/yyyy}."
        };

    /// <summary>Số tiền kiểu Việt Nam, dấu chấm ngăn hàng nghìn: 2.350.000 đồng — không phụ thuộc ngôn ngữ của máy chủ.</summary>
    private static string Money(decimal amount)
        => amount.ToString("#,0", CultureInfo.InvariantCulture).Replace(",", ".") + " đồng";

    /// <summary>Lượt báo đang chờ xác nhận cùng hóa đơn của nó, đã kiểm tra quyền của Chủ trọ.</summary>
    private sealed record PendingPaymentReport(Invoice Invoice, PaymentReport Report);

    /// <summary>Chỉ số, ảnh đồng hồ và các dòng điều chỉnh đã qua kiểm tra, dùng chung cho lập và sửa.</summary>
    private sealed record PeriodicInvoiceDraft(
        MeterReading Electricity,
        MeterReading Water,
        string? ElectricityMeterPhotoPath,
        string? WaterMeterPhotoPath,
        IReadOnlyList<InvoiceLine> Lines);

    /// <summary>
    /// Giá trị ghi nhật ký TaoHoaDon, SuaHoaDon (BR-23): kỳ, chỉ số, các khoản tiền, từng dòng điều chỉnh, cùng trạng thái
    /// và hạn thanh toán — sửa hóa đơn đã phát hành tính lại hạn (FR-50).
    /// </summary>
    private sealed record PeriodicInvoiceAudit(
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
        string Status,
        DateOnly? DueDate,
        IReadOnlyList<PeriodicInvoiceAuditLine> Lines)
    {
        public static PeriodicInvoiceAudit Of(Invoice invoice) => new(
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
            invoice.Status.ToString(),
            invoice.DueDate,
            invoice.Lines
                .Select(l => new PeriodicInvoiceAuditLine(l.Description, l.Amount, l.RelatedInvoiceId))
                .ToList());
    }

    /// <summary>Một dòng điều chỉnh trong nhật ký hóa đơn định kỳ.</summary>
    private sealed record PeriodicInvoiceAuditLine(string Description, decimal Amount, long? RelatedInvoiceId);
}
