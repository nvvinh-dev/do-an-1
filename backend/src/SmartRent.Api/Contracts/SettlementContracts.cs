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
