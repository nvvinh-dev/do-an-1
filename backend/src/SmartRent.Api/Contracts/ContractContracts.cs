using SmartRent.Domain.Enums;

namespace SmartRent.Api.Contracts;

public record ContractServiceFeeRequest(string Name, decimal? Amount);

public record ContractOccupantRequest(string FullName, string? PhoneNumber);

/// <summary>
/// Điều khoản chốt cứng vào hợp đồng (BR-12). Dùng chung cho lập và sửa hợp đồng.
/// Các trường số và ngày khai báo nullable để thiếu trường thì validator trả 400,
/// thay vì nhận giá trị mặc định — nhất là tiền cọc (BR-21).
/// </summary>
public abstract record ContractTermsRequest
{
    public decimal? RentPrice { get; init; }

    public decimal? ElectricityUnitPrice { get; init; }

    public decimal? WaterUnitPrice { get; init; }

    public decimal? DepositAmount { get; init; }

    public decimal? InitialElectricityIndex { get; init; }

    public decimal? InitialWaterIndex { get; init; }

    public DateOnly? StartDate { get; init; }

    public DateOnly? EndDate { get; init; }

    public int? PaymentDueDays { get; init; }

    public IReadOnlyList<ContractServiceFeeRequest>? ServiceFees { get; init; }

    public IReadOnlyList<ContractOccupantRequest>? Occupants { get; init; }
}

public record CreateContractRequest : ContractTermsRequest
{
    public long? RentalRequestId { get; init; }
}

/// <summary>Thay toàn bộ điều khoản; <c>serviceFees</c> và <c>occupants</c> thay nguyên danh sách.</summary>
public record UpdateContractRequest : ContractTermsRequest;

public record RequestContractChangesRequest(string Reason);

public record CancelContractRequest(string Reason);

public record ConfirmDepositRequest(DateTimeOffset? ReceivedAt, PaymentMethod? Method);

/// <summary>
/// Ghi nhận hoàn cọc cho hợp đồng đã hủy. <see cref="Amount"/> và <see cref="Note"/> chỉ dùng khi
/// Người thuê là bên hủy; Chủ trọ hủy thì server hoàn toàn bộ cọc và bỏ qua hai trường này (BR-22).
/// </summary>
public record RefundDepositRequest(
    DateTimeOffset? RefundedAt,
    PaymentMethod? RefundMethod,
    decimal? Amount,
    string? Note);

public record InitialMeterReadingsRequest(decimal? InitialElectricityIndex, decimal? InitialWaterIndex);

/// <summary>Chỉ số điện nước cuối cùng đã ghi nhận của phòng, dùng điền sẵn chỉ số đầu khi lập hợp đồng.</summary>
public record MeterReadingsResponse(decimal ElectricityIndex, decimal WaterIndex);

public record ContractListItemResponse(
    long Id,
    RoomReferenceResponse Room,
    string TenantName,
    string LandlordName,
    decimal RentPrice,
    DateOnly StartDate,
    DateOnly EndDate,
    ContractStatus Status,
    DateTimeOffset? HoldExpiresAt);

/// <summary>Một bên của hợp đồng. Số điện thoại chỉ có khi được phép theo QR-07.</summary>
public record ContractPartyResponse(string FullName, string? PhoneNumber);

public record ContractServiceFeeResponse(string Name, decimal Amount);

public record ContractOccupantResponse(string FullName, string? PhoneNumber);

public record DepositRefundResponse(
    decimal Amount,
    DateTimeOffset RefundedAt,
    PaymentMethod Method,
    string? Note);

/// <summary>
/// Chi tiết hợp đồng cho hai bên. <see cref="CancelledBy"/> là <c>Landlord</c>, <c>Tenant</c> hoặc
/// <c>System</c>; <see cref="PaymentQr"/> chỉ có với Người thuê đứng tên khi hợp đồng chờ nhận cọc.
/// </summary>
public record ContractDetailResponse(
    long Id,
    long? RentalRequestId,
    RoomReferenceResponse Room,
    ContractPartyResponse Tenant,
    ContractPartyResponse Landlord,
    decimal RentPrice,
    decimal ElectricityUnitPrice,
    decimal WaterUnitPrice,
    decimal DepositAmount,
    decimal InitialElectricityIndex,
    decimal InitialWaterIndex,
    DateOnly StartDate,
    DateOnly EndDate,
    int PaymentDueDays,
    IReadOnlyList<ContractServiceFeeResponse> ServiceFees,
    IReadOnlyList<ContractOccupantResponse> Occupants,
    ContractStatus Status,
    DateTimeOffset? TenantConfirmedAt,
    DateTimeOffset? DepositReceivedAt,
    PaymentMethod? DepositReceivedMethod,
    DateTimeOffset? ActivatedAt,
    string? CancelReason,
    string? CancelledBy,
    DateTimeOffset? CancelledAt,
    DateTimeOffset? HoldExpiresAt,
    PaymentQrResponse? PaymentQr,
    DepositRefundResponse? DepositRefund,
    bool DepositRefundPending);
