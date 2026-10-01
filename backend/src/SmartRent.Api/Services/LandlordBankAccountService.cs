using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using SmartRent.Api.Contracts;
using SmartRent.Api.Validators;
using SmartRent.Infrastructure.Identity;
using SmartRent.Infrastructure.Persistence;

namespace SmartRent.Api.Services;

/// <summary>Tài khoản ngân hàng nhận tiền của Chủ trọ — BR-26, FR-77.</summary>
public partial class LandlordBankAccountService
{
    private readonly AppDbContext _db;
    private readonly AuditLogger _auditLogger;

    public LandlordBankAccountService(AppDbContext db, AuditLogger auditLogger)
    {
        _db = db;
        _auditLogger = auditLogger;
    }

    /// <summary>Chưa khai báo thì trả về null.</summary>
    public async Task<ServiceResult<BankAccountResponse?>> GetAsync(
        long landlordUserId,
        CancellationToken cancellationToken = default)
    {
        var user = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == landlordUserId, cancellationToken);

        return user is null
            ? ServiceResult<BankAccountResponse?>.Fail(StatusCodes.Status404NotFound, "Khong tim thay tai khoan.")
            : ServiceResult<BankAccountResponse?>.Ok(ToResponse(user));
    }

    /// <summary>Khai báo hoặc sửa. Mỗi lần gọi đều ghi nhật ký giá trị cũ và mới (BR-23).</summary>
    public async Task<ServiceResult<BankAccountResponse>> UpdateAsync(
        long landlordUserId,
        BankAccountRequest request,
        CancellationToken cancellationToken = default)
    {
        var bankBin = request.BankBin.Trim();
        var accountNumber = request.AccountNumber.Trim();
        var accountName = request.AccountName.Trim();

        if (!VietQrBankBins.Contains(bankBin))
        {
            return ServiceResult<BankAccountResponse>.Fail(
                StatusCodes.Status422UnprocessableEntity, "Ma ngan hang khong co trong danh sach VietQR.");
        }

        if (!AccountNumberPattern().IsMatch(accountNumber))
        {
            return ServiceResult<BankAccountResponse>.Fail(
                StatusCodes.Status422UnprocessableEntity, "So tai khoan chi duoc gom chu so.");
        }

        if (!AccountNamePattern().IsMatch(accountName))
        {
            return ServiceResult<BankAccountResponse>.Fail(
                StatusCodes.Status422UnprocessableEntity, "Ten chu tai khoan phai viet hoa, khong dau.");
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == landlordUserId, cancellationToken);

        if (user is null)
        {
            return ServiceResult<BankAccountResponse>.Fail(StatusCodes.Status404NotFound, "Khong tim thay tai khoan.");
        }

        var previous = ToResponse(user);

        user.BankBin = bankBin;
        user.BankAccountNumber = accountNumber;
        user.BankAccountName = accountName;

        var current = ToResponse(user)!;

        _auditLogger.Write(
            landlordUserId,
            previous is null ? "KhaiBaoTaiKhoanNhanTien" : "SuaTaiKhoanNhanTien",
            nameof(AppUser),
            user.Id,
            previous,
            current);

        await _db.SaveChangesAsync(cancellationToken);

        return ServiceResult<BankAccountResponse>.Ok(current);
    }

    private static BankAccountResponse? ToResponse(AppUser user)
        => user.BankBin is null || user.BankAccountNumber is null || user.BankAccountName is null
            ? null
            : new BankAccountResponse(user.BankBin, user.BankAccountNumber, user.BankAccountName);

    [GeneratedRegex("^[0-9]+$")]
    private static partial Regex AccountNumberPattern();

    [GeneratedRegex("^[A-Z]+( [A-Z]+)*$")]
    private static partial Regex AccountNamePattern();
}
