namespace SmartRent.Api.Contracts;

/// <summary>Tài khoản nhận tiền Chủ trọ khai báo (BR-26). Cả ba trường bắt buộc.</summary>
public record BankAccountRequest(string BankBin, string AccountNumber, string AccountName);

/// <summary>Chỉ trả cho chính Chủ trọ sở hữu tài khoản.</summary>
public record BankAccountResponse(string BankBin, string AccountNumber, string AccountName);

/// <summary>
/// Dữ liệu để frontend dựng mã VietQR (BR-26). Chỉ trả cho Người thuê đứng tên khi có khoản cần chuyển khoản;
/// <see cref="Amount"/> và <see cref="TransferContent"/> do server tính, frontend không tự tính lại.
/// </summary>
public record PaymentQrResponse(
    string BankBin,
    string AccountNumber,
    string AccountName,
    decimal Amount,
    string TransferContent);
