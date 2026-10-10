using SmartRent.Api.Contracts;
using SmartRent.Domain;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Storage;

namespace SmartRent.Api.Services;

/// <summary>
/// Dựng chi tiết hóa đơn theo cấu trúc GET /invoices/{id} (api-design mục 9). Dùng chung cho API hóa đơn thanh lý
/// (BP-10) và API hóa đơn (BP-07). Không kiểm tra quyền — bên gọi đã xác định người gọi được xem hóa đơn này.
/// </summary>
public class InvoiceDetailBuilder
{
    /// <summary>URL có chữ ký của file riêng tư hết hạn sau 1 giờ (api-design mục 14).</summary>
    private static readonly TimeSpan PrivateFileUrlLifetime = TimeSpan.FromHours(1);

    private readonly IFileStorage _fileStorage;

    public InvoiceDetailBuilder(IFileStorage fileStorage)
    {
        _fileStorage = fileStorage;
    }

    /// <summary>
    /// Cần nạp <see cref="Invoice.Contract"/> kèm <see cref="Contract.ServiceFees"/>, <see cref="Invoice.Lines"/> và
    /// <see cref="Invoice.PaymentReports"/>. <paramref name="paymentQr"/> do bên gọi tính theo mục 9.1 — chỉ có với
    /// Người thuê đứng tên khi hóa đơn còn phải trả; hóa đơn ở Nháp luôn là <c>null</c>.
    /// </summary>
    public async Task<InvoiceDetailResponse> BuildAsync(
        Invoice invoice,
        PaymentQrResponse? paymentQr,
        CancellationToken cancellationToken = default)
    {
        var lines = invoice.Lines.OrderBy(l => l.Id).ToList();
        var paymentReports = invoice.PaymentReports.OrderBy(p => p.ReportedAt).ToList();

        // Mỗi ảnh riêng tư là một lần gọi Storage để ký URL — gọi song song.
        var electricityPhotoTask = SignAsync(invoice.ElectricityMeterPhotoUrl, cancellationToken);
        var waterPhotoTask = SignAsync(invoice.WaterMeterPhotoUrl, cancellationToken);
        var evidenceTasks = lines.Select(l => SignAsync(l.EvidenceUrl, cancellationToken)).ToList();
        var proofTasks = paymentReports.Select(p => SignAsync(p.ProofImageUrl, cancellationToken)).ToList();

        await Task.WhenAll(new[] { electricityPhotoTask, waterPhotoTask }.Concat(evidenceTasks).Concat(proofTasks));

        var period = new BillingPeriod(invoice.PeriodStart, invoice.PeriodEnd);

        // Hóa đơn thanh lý của tháng đã có hóa đơn định kỳ không tính tiền phòng (FR-93). Giá thuê trong hợp đồng
        // luôn lớn hơn 0, nên tiền phòng bằng 0 nghĩa là không có ngày nào được tính.
        var daysCharged = invoice.Type == InvoiceType.ThanhLy && invoice.RentAmount == 0 ? 0 : period.DaysCharged;

        return new InvoiceDetailResponse(
            invoice.Id,
            invoice.ContractId,
            invoice.Type,
            invoice.PeriodStart,
            invoice.PeriodEnd,
            daysCharged,
            period.DaysInMonth,
            invoice.PreviousElectricityIndex,
            invoice.CurrentElectricityIndex,
            invoice.ElectricityUnitPrice,
            invoice.ElectricityAmount,
            invoice.PreviousWaterIndex,
            invoice.CurrentWaterIndex,
            invoice.WaterUnitPrice,
            invoice.WaterAmount,
            invoice.RentAmount,
            invoice.Contract.ServiceFees
                .OrderBy(f => f.Id)
                .Select(f => new ContractServiceFeeResponse(f.Name, f.Amount))
                .ToList(),
            invoice.ServiceFeeAmount,
            invoice.TotalAmount,
            invoice.PaidAmount,
            invoice.Status,
            invoice.IssuedAt,
            invoice.DueDate,
            invoice.SettledAt,
            invoice.CancelReason,
            electricityPhotoTask.Result,
            waterPhotoTask.Result,
            lines
                .Select((l, index) => new InvoiceLineResponse(
                    l.Category, l.Description, l.Amount, evidenceTasks[index].Result, l.RelatedInvoiceId))
                .ToList(),
            paymentReports
                .Select((p, index) => new PaymentReportResponse(
                    p.Id,
                    p.ReportedAmount,
                    proofTasks[index].Result!,
                    p.ReportedAt,
                    p.Status,
                    p.ConfirmedAmount,
                    p.ConfirmedAt,
                    p.RejectReason))
                .ToList(),
            paymentQr,
            invoice.SentAt,
            invoice.TenantConfirmedAt,
            invoice.ChangeRequestReason,
            invoice.LandlordFinalizeNote);
    }

    private async Task<string?> SignAsync(string? path, CancellationToken cancellationToken)
        => path is null ? null : await _fileStorage.CreateSignedUrlAsync(path, PrivateFileUrlLifetime, cancellationToken);
}
