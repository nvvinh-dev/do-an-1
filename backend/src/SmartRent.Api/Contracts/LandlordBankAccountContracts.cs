namespace SmartRent.Api.Contracts;

/// <summary>Tài khoản nhận tiền Chủ trọ khai báo (BR-26). Cả ba trường bắt buộc.</summary>
public record BankAccountRequest(string BankBin, string AccountNumber, string AccountName);

/// <summary>Chỉ trả cho chính Chủ trọ sở hữu tài khoản.</summary>
public record BankAccountResponse(string BankBin, string AccountNumber, string AccountName);
