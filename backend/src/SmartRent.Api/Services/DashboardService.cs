using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SmartRent.Api.Contracts;
using SmartRent.Domain;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Persistence;

namespace SmartRent.Api.Services;

/// <summary>
/// Dashboard theo vai trò — FR-65 đến FR-68, api-design mục 12. Chỉ đọc; mọi số liệu tính từ dữ liệu của chính
/// người gọi, xác định qua chuỗi hóa đơn → hợp đồng → phòng → khu trọ → Chủ trọ.
/// </summary>
public class DashboardService
{
    private readonly AppDbContext _db;

    public DashboardService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>FR-66, FR-67: số phòng, hóa đơn chưa thu, doanh thu 6 tháng và việc cần xử lý của Chủ trọ.</summary>
    public async Task<LandlordDashboardResponse> GetLandlordAsync(
        long landlordUserId,
        CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var today = VietnamTime.DateOf(now);

        // Chỉ số đếm phòng bỏ phòng đã lưu trữ; phòng của khu đã lưu trữ cũng ở Lưu trữ (BR-10).
        var roomGroups = await _db.Rooms
            .AsNoTracking()
            .Where(r => r.Property.LandlordUserId == landlordUserId && r.OccupancyStatus != RoomOccupancyStatus.LuuTru)
            .GroupBy(r => r.OccupancyStatus)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Status, g => g.Count, cancellationToken);

        int CountOf(RoomOccupancyStatus status) => roomGroups.GetValueOrDefault(status);

        var roomCounts = new RoomCountsResponse(
            roomGroups.Values.Sum(),
            CountOf(RoomOccupancyStatus.Trong),
            CountOf(RoomOccupancyStatus.DangGiuCho),
            CountOf(RoomOccupancyStatus.DangThue),
            CountOf(RoomOccupancyStatus.BaoTri));

        // Phòng đã lưu trữ vẫn có thể còn hóa đơn thanh lý chưa trả (FR-96) — vẫn là khoản phải thu.
        var outstanding = _db.Invoices
            .AsNoTracking()
            .Where(i => i.Contract.Room.Property.LandlordUserId == landlordUserId
                        && Invoice.OutstandingStatuses.Contains(i.Status));

        var unpaidInvoices = new UnpaidInvoicesResponse(
            await outstanding.CountAsync(cancellationToken),
            await outstanding.SumAsync(i => i.TotalAmount - i.PaidAmount, cancellationToken));

        // FR-67: chỉ các khoản Chủ trọ đã xác nhận thu; tiền cọc không đi qua lượt báo thanh toán nên không lẫn vào.
        var windowStart = MonthlyRevenue.WindowStart(today);

        var payments = await _db.PaymentReports
            .AsNoTracking()
            .Where(p => p.Status == PaymentReportStatus.DaXacNhan
                        && p.ConfirmedAt != null
                        && p.ConfirmedAmount != null
                        && p.ConfirmedAt >= windowStart
                        && p.Invoice.Contract.Room.Property.LandlordUserId == landlordUserId)
            .Select(p => new { ConfirmedAt = p.ConfirmedAt!.Value, Amount = p.ConfirmedAmount!.Value })
            .ToListAsync(cancellationToken);

        var monthlyRevenue = MonthlyRevenue
            .Summarize(payments.Select(p => (p.ConfirmedAt, p.Amount)), today)
            .Select(m => new MonthlyRevenueResponse(
                m.Month.ToString("yyyy-MM", CultureInfo.InvariantCulture), m.Amount))
            .ToList();

        // Đã quá hạn thì không còn thao tác được, dù tác vụ định kỳ chưa kịp chuyển trạng thái — cùng điều kiện với
        // RentalRequest.IsAwaitingReview và Contract.IsHoldExpired.
        var reviewFrom = now - RentalRequest.ReviewWindow;
        var holdFrom = now - RentalRequest.HoldWindow;

        var pendingActions = new LandlordPendingActionsResponse(
            await _db.RentalRequests.CountAsync(
                r => r.Room.Property.LandlordUserId == landlordUserId
                     && r.Status == RentalRequestStatus.ChoDuyet
                     && r.SubmittedAt >= reviewFrom,
                cancellationToken),
            await _db.PaymentReports.CountAsync(
                p => p.Invoice.Contract.Room.Property.LandlordUserId == landlordUserId
                     && p.Status == PaymentReportStatus.ChoXacNhan,
                cancellationToken),
            await _db.Contracts.CountAsync(
                c => c.Room.Property.LandlordUserId == landlordUserId
                     && c.Status == ContractStatus.ChoNhanCoc
                     && (c.RentalRequest == null
                         || c.RentalRequest.ProcessedAt == null
                         || c.RentalRequest.ProcessedAt >= holdFrom),
                cancellationToken));

        return new LandlordDashboardResponse(roomCounts, unpaidInvoices, monthlyRevenue, pendingActions);
    }
}
