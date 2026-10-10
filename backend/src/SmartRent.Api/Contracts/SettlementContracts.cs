using SmartRent.Domain.Enums;

namespace SmartRent.Api.Contracts;

/// <summary>
/// FR-53: gửi thông báo trả phòng. Ngày khai báo nullable để thiếu trường thì validator trả 400;
/// ngày trước hôm nay là quy tắc nghiệp vụ, trả 422 ở SettlementService.
/// </summary>
public record SendMoveOutNoticeRequest(DateOnly? ExpectedMoveOutDate, string Reason);

/// <summary>
/// Thông báo trả phòng của hợp đồng. <see cref="NoticeBy"/> là <c>Landlord</c> hoặc <c>Tenant</c>;
/// <see cref="NoticeDays"/> tính từ ngày gửi tới ngày trả phòng dự kiến; <see cref="PenaltyAllowed"/> cho hai bên
/// biết hóa đơn thanh lý có được tính phí phạt hay không (FR-87).
/// </summary>
public record MoveOutNoticeResponse(
    DateTimeOffset NoticeAt,
    string NoticeBy,
    DateOnly ExpectedMoveOutDate,
    string Reason,
    int NoticeDays,
    bool PenaltyAllowed);

/// <summary>
/// FR-54: lập hoặc sửa hóa đơn thanh lý — chỉ số chốt lần cuối, ngày trả phòng thực tế, ảnh đồng hồ và các dòng Chủ trọ
/// gửi (api-design mục 10). Chỉ số cũ, kỳ và mọi số tiền do server tính. Trường bắt buộc để nullable để thiếu trường thì
/// validator trả 400; vi phạm quy tắc nghiệp vụ trả 409 hoặc 422 ở SettlementService.
/// </summary>
public record SettlementInvoiceRequest(
    decimal? CurrentElectricityIndex,
    decimal? CurrentWaterIndex,
    DateOnly? MoveOutDate,
    string? ElectricityMeterPhotoPath,
    string? WaterMeterPhotoPath,
    IReadOnlyList<SettlementInvoiceLineRequest>? Lines);

/// <summary>
/// Một dòng Chủ trọ gửi: chỉ <c>BoiThuongHuHong</c>, <c>PhiPhat</c>, <c>DieuChinhKhac</c>, mỗi dòng có mô tả (BR-22).
/// <see cref="EvidencePath"/> là ảnh hư hỏng (<c>AnhHuHong</c>); <see cref="RelatedInvoiceId"/> chỉ dùng cho dòng điều
/// chỉnh sai sót của một hóa đơn trước cùng hợp đồng (BR-16).
/// </summary>
public record SettlementInvoiceLineRequest(
    InvoiceLineCategory? Category,
    string? Description,
    decimal? Amount,
    string? EvidencePath,
    long? RelatedInvoiceId);

/// <summary>FR-57: người thuê chưa đồng ý bảng thanh lý — lý do bắt buộc, gửi kèm thông báo cho Chủ trọ.</summary>
public record SettlementChangeRequest(string Reason);

/// <summary>FR-95: Chủ trọ tự chốt bảng thanh lý khi người thuê không phản hồi quá 7 ngày — ghi chú bắt buộc.</summary>
public record SettlementFinalizeRequest(string Note);

/// <summary>
/// FR-59, FR-86: hoàn tất thanh lý. <see cref="RoomNextStatus"/> bắt buộc, chỉ <c>Trong</c> hoặc <c>BaoTri</c>.
/// <see cref="RefundedAt"/>, <see cref="RefundMethod"/> bắt buộc khi hóa đơn thanh lý ở Chờ hoàn cọc và bị bỏ qua ở
/// trường hợp khác — thiếu thì SettlementService trả 422 vì phụ thuộc trạng thái hóa đơn. Số tiền hoàn do server tính.
/// </summary>
public record CompleteSettlementRequest(
    RoomOccupancyStatus? RoomNextStatus,
    DateTimeOffset? RefundedAt,
    PaymentMethod? RefundMethod);
