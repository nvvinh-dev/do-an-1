using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SmartRent.Api.Contracts;
using SmartRent.Domain;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Identity;
using SmartRent.Infrastructure.Persistence;

namespace SmartRent.Api.Services;

/// <summary>
/// Dashboard theo vai trò — FR-65 đến FR-68, api-design mục 12. Chỉ đọc; số liệu của Chủ trọ và Người thuê tính từ
/// dữ liệu của chính người gọi, xác định qua chuỗi hóa đơn → hợp đồng → phòng → khu trọ → Chủ trọ; số liệu của Admin
/// là toàn hệ thống.
/// </summary>
public class DashboardService
{
    private readonly AppDbContext _db;

    public DashboardService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>FR-65: số tài khoản theo vai trò, khu trọ, phòng và hồ sơ Chủ trọ chờ duyệt của toàn hệ thống.</summary>
    public async Task<AdminDashboardResponse> GetAdminAsync(CancellationToken cancellationToken = default)
    {
        // Tính cả tài khoản bị khóa: dashboard đếm tài khoản, không đếm tài khoản đang hoạt động.
        var totalUsers = await _db.Users.AsNoTracking().CountAsync(cancellationToken);

        var roleCounts = await (from userRole in _db.UserRoles.AsNoTracking()
                                join role in _db.Roles.AsNoTracking() on userRole.RoleId equals role.Id
                                group userRole by role.Name into g
                                select new { Role = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Role!, g => g.Count, cancellationToken);

        var users = new UserCountsResponse(
            totalUsers,
            roleCounts.GetValueOrDefault(AppRoles.Admin),
            roleCounts.GetValueOrDefault(AppRoles.Landlord),
            roleCounts.GetValueOrDefault(AppRoles.Tenant));

        // Khu trọ và phòng đã lưu trữ không tính; phòng của khu đã lưu trữ cũng ở Lưu trữ (BR-10).
        var properties = await _db.Properties
            .AsNoTracking()
            .CountAsync(p => p.Status != PropertyStatus.LuuTru, cancellationToken);

        var rooms = await _db.Rooms
            .AsNoTracking()
            .CountAsync(r => r.OccupancyStatus != RoomOccupancyStatus.LuuTru, cancellationToken);

        var pendingApplications = await _db.LandlordApplications
            .AsNoTracking()
            .CountAsync(a => a.Status == LandlordApplicationStatus.ChoDuyet, cancellationToken);

        return new AdminDashboardResponse(users, properties, rooms, pendingApplications);
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

    /// <summary>FR-68: hợp đồng hiện tại, hóa đơn chưa thanh toán, tổng đã thanh toán và việc cần xử lý của Người thuê.</summary>
    public async Task<TenantDashboardResponse> GetTenantAsync(
        long tenantUserId,
        CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;

        // Người thuê thấy hợp đồng mình đứng tên kể cả ở Nháp, như ở danh sách hợp đồng; id tăng theo thứ tự lập.
        var contracts = await _db.Contracts
            .AsNoTracking()
            .Where(c => c.TenantUserId == tenantUserId
                        && c.Status != ContractStatus.DaThanhLy
                        && c.Status != ContractStatus.DaHuy)
            .OrderByDescending(c => c.Id)
            .Select(c => new TenantDashboardContractResponse(
                c.Id,
                c.Room.Code,
                c.Room.Property.Name,
                c.Status,
                c.StartDate,
                c.EndDate,
                c.RentPrice))
            .ToListAsync(cancellationToken);

        // Cùng cách tính với dashboard Chủ trọ; người thuê không thấy hóa đơn Nháp nên tập này cũng không gồm Nháp.
        var outstanding = _db.Invoices
            .AsNoTracking()
            .Where(i => i.Contract.TenantUserId == tenantUserId && Invoice.OutstandingStatuses.Contains(i.Status));

        var unpaidInvoices = new UnpaidInvoicesResponse(
            await outstanding.CountAsync(cancellationToken),
            await outstanding.SumAsync(i => i.TotalAmount - i.PaidAmount, cancellationToken));

        // Chỉ các khoản Chủ trọ đã xác nhận thu, như doanh thu ở FR-67; tiền cọc không đi qua lượt báo thanh toán.
        var totalPaid = await _db.PaymentReports
            .AsNoTracking()
            .Where(p => p.Status == PaymentReportStatus.DaXacNhan
                        && p.ConfirmedAmount != null
                        && p.Invoice.Contract.TenantUserId == tenantUserId)
            .SumAsync(p => p.ConfirmedAmount!.Value, cancellationToken);

        // Hợp đồng đã quá hạn giữ chỗ thì người thuê không đồng ý được nữa (Contract.CanConfirmByTenant), dù tác vụ định
        // kỳ chưa kịp hủy — cùng điều kiện với Contract.IsHoldExpired.
        var holdFrom = now - RentalRequest.HoldWindow;

        var pendingActions = new TenantPendingActionsResponse(
            await _db.Contracts.CountAsync(
                c => c.TenantUserId == tenantUserId
                     && c.Status == ContractStatus.ChoNguoiThueXacNhan
                     && (c.RentalRequest == null
                         || c.RentalRequest.ProcessedAt == null
                         || c.RentalRequest.ProcessedAt >= holdFrom),
                cancellationToken),
            await _db.Invoices.CountAsync(
                i => i.Contract.TenantUserId == tenantUserId
                     && i.Type == InvoiceType.ThanhLy
                     && i.Status == InvoiceStatus.ChoNguoiThueXacNhan,
                cancellationToken));

        return new TenantDashboardResponse(contracts, unpaidInvoices, totalPaid, pendingActions);
    }
}
