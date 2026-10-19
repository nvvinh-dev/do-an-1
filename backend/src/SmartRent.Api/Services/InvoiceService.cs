using Microsoft.EntityFrameworkCore;
using SmartRent.Api.Contracts;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Persistence;

namespace SmartRent.Api.Services;

/// <summary>
/// Hóa đơn định kỳ và thanh toán — BP-07. Chủ trọ chỉ thao tác trên hợp đồng và hóa đơn thuộc phòng của mình: quyền sở
/// hữu truy hóa đơn → hợp đồng → phòng → khu trọ → Chủ trọ, tài nguyên không thuộc người gọi trả 404 như không tồn tại.
/// </summary>
public class InvoiceService
{
    private const string ContractNotFoundMessage = "Không tìm thấy hợp đồng.";

    private readonly AppDbContext _db;

    public InvoiceService(AppDbContext db)
    {
        _db = db;
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
}
