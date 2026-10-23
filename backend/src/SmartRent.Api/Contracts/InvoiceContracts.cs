using System.Globalization;
using SmartRent.Domain.Enums;

namespace SmartRent.Api.Contracts;

/// <summary>
/// FR-38, FR-41: chốt chỉ số và lập hóa đơn định kỳ (api-design mục 9); sửa hóa đơn định kỳ dùng cùng body. Chỉ số cũ,
/// kỳ và mọi số tiền do server tính. Trường bắt buộc để nullable để thiếu trường thì validator trả 400; vi phạm quy tắc
/// nghiệp vụ trả 409 hoặc 422 ở InvoiceService.
/// </summary>
public record PeriodicInvoiceRequest(
    decimal? CurrentElectricityIndex,
    decimal? CurrentWaterIndex,
    string? ElectricityMeterPhotoPath,
    string? WaterMeterPhotoPath,
    IReadOnlyList<InvoiceAdjustmentLineRequest>? AdjustmentLines);

/// <summary>
/// Một dòng điều chỉnh của hóa đơn định kỳ: chỉ nhận <c>DieuChinhKhac</c>, có mô tả; số tiền dương là khoản thu thêm, âm là
/// khoản giảm (FR-41). <see cref="RelatedInvoiceId"/> trỏ về hóa đơn trước cùng hợp đồng khi dòng điều chỉnh sai sót của
/// hóa đơn đó (BR-16).
/// </summary>
public record InvoiceAdjustmentLineRequest(
    InvoiceLineCategory? Category,
    string? Description,
    decimal? Amount,
    long? RelatedInvoiceId);

/// <summary>FR-52: hủy hóa đơn định kỳ mới nhất chưa thu đồng nào, lý do bắt buộc.</summary>
public record CancelInvoiceRequest(string Reason);

/// <summary>
/// Bộ lọc của GET /invoices (api-design mục 9), mọi trường tùy chọn. <see cref="Status"/> lặp lại được
/// (<c>?status=ChuaThanhToan&amp;status=QuaHan</c>). <see cref="Month"/> dạng <c>YYYY-MM</c>, so với tháng của ngày đầu kỳ.
/// <see cref="PropertyId"/> và <see cref="RoomId"/> chỉ dành cho Chủ trọ; Người thuê gửi lên thì bị bỏ qua.
/// </summary>
public record InvoiceListFilter(
    InvoiceStatus[]? Status,
    string? Month,
    long? PropertyId,
    long? RoomId,
    InvoiceType? Type)
{
    /// <summary>Ngày đầu của tháng <c>YYYY-MM</c>; sai dạng thì trả false (validator đã chặn bằng 400).</summary>
    public static bool TryParseMonth(string month, out DateOnly firstDay)
        => DateOnly.TryParseExact(month, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out firstDay);
}

/// <summary>Một dòng của GET /contracts/{contractId}/invoices — kỳ mới trước, không phân trang.</summary>
public record ContractInvoiceListItemResponse(
    long Id,
    InvoiceType Type,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    decimal TotalAmount,
    decimal PaidAmount,
    InvoiceStatus Status,
    DateTimeOffset? IssuedAt,
    DateOnly? DueDate);

/// <summary>Một dòng của GET /invoices: các trường của danh sách theo hợp đồng, cộng hợp đồng, phòng và người thuê.</summary>
public record InvoiceListItemResponse(
    long Id,
    long ContractId,
    string RoomCode,
    string PropertyName,
    string TenantName,
    InvoiceType Type,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    decimal TotalAmount,
    decimal PaidAmount,
    InvoiceStatus Status,
    DateTimeOffset? IssuedAt,
    DateOnly? DueDate);

/// <summary>
/// Chi tiết hóa đơn — cấu trúc của GET /invoices/{id} (api-design mục 9), dùng chung cho hóa đơn định kỳ và hóa đơn
/// thanh lý. <see cref="DaysCharged"/> trên <see cref="DaysInMonth"/> là tỷ lệ ngày đã dùng tính tiền phòng và phí dịch
/// vụ (BR-15); hóa đơn thanh lý không tính tiền phòng (FR-93) có <see cref="DaysCharged"/> bằng 0.
/// <see cref="ServiceFees"/> là các phí đã chốt trong hợp đồng, theo tháng — để người thuê hiểu cách tính (FR-44).
/// Ảnh đồng hồ, ảnh hư hỏng và minh chứng thanh toán là URL có chữ ký, có hạn (api-design mục 14).
/// <see cref="PaymentQr"/> dùng chung <see cref="PaymentQrResponse"/> với mã cọc, nội dung chuyển khoản dạng
/// <c>SMARTRENT HD&lt;id hóa đơn&gt;</c> (mục 9.1).
/// <see cref="SentAt"/>, <see cref="TenantConfirmedAt"/>, <see cref="ChangeRequestReason"/>,
/// <see cref="LandlordFinalizeNote"/> chỉ có giá trị với hóa đơn thanh lý.
/// </summary>
public record InvoiceDetailResponse(
    long Id,
    long ContractId,
    InvoiceType Type,
    DateOnly PeriodStart,
    DateOnly PeriodEnd,
    int DaysCharged,
    int DaysInMonth,
    decimal PreviousElectricityIndex,
    decimal CurrentElectricityIndex,
    decimal ElectricityUnitPrice,
    decimal ElectricityAmount,
    decimal PreviousWaterIndex,
    decimal CurrentWaterIndex,
    decimal WaterUnitPrice,
    decimal WaterAmount,
    decimal RentAmount,
    IReadOnlyList<ContractServiceFeeResponse> ServiceFees,
    decimal ServiceFeeAmount,
    decimal TotalAmount,
    decimal PaidAmount,
    InvoiceStatus Status,
    DateTimeOffset? IssuedAt,
    DateOnly? DueDate,
    DateTimeOffset? SettledAt,
    string? CancelReason,
    string? ElectricityMeterPhotoUrl,
    string? WaterMeterPhotoUrl,
    IReadOnlyList<InvoiceLineResponse> Lines,
    IReadOnlyList<PaymentReportResponse> PaymentReports,
    PaymentQrResponse? PaymentQr,
    DateTimeOffset? SentAt,
    DateTimeOffset? TenantConfirmedAt,
    string? ChangeRequestReason,
    string? LandlordFinalizeNote);

/// <summary>Một dòng chi tiết của hóa đơn. Số tiền dương là khoản phải thu, âm là khoản trừ.</summary>
public record InvoiceLineResponse(
    InvoiceLineCategory Category,
    string Description,
    decimal Amount,
    string? EvidenceUrl,
    long? RelatedInvoiceId);

/// <summary>Một lượt người thuê báo đã thanh toán và kết quả Chủ trọ xác nhận (api-design mục 9).</summary>
public record PaymentReportResponse(
    long Id,
    decimal ReportedAmount,
    string ProofImageUrl,
    DateTimeOffset ReportedAt,
    PaymentReportStatus Status,
    decimal? ConfirmedAmount,
    DateTimeOffset? ConfirmedAt,
    string? RejectReason);
