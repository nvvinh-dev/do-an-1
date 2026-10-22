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
/// </summary>
public class InvoiceService
{
    private const string ContractNotFoundMessage = "Không tìm thấy hợp đồng.";

    private const string AmountTooLargeMessage =
        "Số tiền của hóa đơn quá lớn. Kiểm tra lại chỉ số điện nước và số tiền của các dòng điều chỉnh.";

    private readonly AppDbContext _db;
    private readonly AuditLogger _auditLogger;
    private readonly IFileStorage _fileStorage;
    private readonly InvoiceDetailBuilder _invoiceDetailBuilder;

    public InvoiceService(
        AppDbContext db,
        AuditLogger auditLogger,
        IFileStorage fileStorage,
        InvoiceDetailBuilder invoiceDetailBuilder)
    {
        _db = db;
        _auditLogger = auditLogger;
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

        if (!amounts.FitsMoneyColumns)
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(
                StatusCodes.Status422UnprocessableEntity, AmountTooLargeMessage);
        }

        if (!amounts.IsTotalAllowed)
        {
            return ServiceResult<InvoiceDetailResponse>.Fail(
                StatusCodes.Status422UnprocessableEntity,
                "Tổng hóa đơn định kỳ không được âm. Khoản giảm lớn hơn tiền tháng thì chia sang các kỳ sau.");
        }

        var invoice = new Invoice
        {
            ContractId = contract.Id,
            Contract = contract,
            Type = InvoiceType.DinhKy,
            Status = InvoiceStatus.Nhap,
            PeriodStart = period.Start,
            PeriodEnd = period.End,
            PreviousElectricityIndex = draft.Electricity.Previous,
            CurrentElectricityIndex = draft.Electricity.Current,
            ElectricityUnitPrice = contract.ElectricityUnitPrice,
            ElectricityAmount = amounts.ElectricityAmount,
            PreviousWaterIndex = draft.Water.Previous,
            CurrentWaterIndex = draft.Water.Current,
            WaterUnitPrice = contract.WaterUnitPrice,
            WaterAmount = amounts.WaterAmount,
            RentAmount = amounts.RentAmount,
            ServiceFeeAmount = amounts.ServiceFeeAmount,
            TotalAmount = amounts.TotalAmount,
            ElectricityMeterPhotoUrl = draft.ElectricityMeterPhotoPath,
            WaterMeterPhotoUrl = draft.WaterMeterPhotoPath,
            Lines = draft.Lines.ToList()
        };

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
    /// Lập hóa đơn định kỳ cũng ghi lại hợp đồng, để lệnh UPDATE kèm điều kiện xmin chạy trong cùng transaction: lập bảng
    /// thanh lý chạy song song — cũng ghi hợp đồng, và không lập khi còn hóa đơn định kỳ ở Nháp — sẽ có một bên nhận
    /// DbUpdateConcurrencyException (409), thay vì hợp đồng vừa có hóa đơn thanh lý vừa có thêm hóa đơn định kỳ (FR-91).
    /// Chỉ khóa dòng (SELECT ... FOR UPDATE) thì không đổi xmin nên không đủ.
    /// </summary>
    private void MarkContractChanged(Contract contract)
        => _db.Entry(contract).Property(c => c.Status).IsModified = true;

    /// <summary>Chỉ số, ảnh đồng hồ và các dòng điều chỉnh đã qua kiểm tra, dùng chung cho lập và sửa.</summary>
    private sealed record PeriodicInvoiceDraft(
        MeterReading Electricity,
        MeterReading Water,
        string? ElectricityMeterPhotoPath,
        string? WaterMeterPhotoPath,
        IReadOnlyList<InvoiceLine> Lines);

    /// <summary>Giá trị ghi nhật ký TaoHoaDon, SuaHoaDon (BR-23): kỳ, chỉ số, các khoản tiền và từng dòng điều chỉnh.</summary>
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
            invoice.Lines
                .Select(l => new PeriodicInvoiceAuditLine(l.Description, l.Amount, l.RelatedInvoiceId))
                .ToList());
    }

    /// <summary>Một dòng điều chỉnh trong nhật ký hóa đơn định kỳ.</summary>
    private sealed record PeriodicInvoiceAuditLine(string Description, decimal Amount, long? RelatedInvoiceId);
}
