using SmartRent.Domain.Enums;

namespace SmartRent.Api.Contracts;

/// <summary>
/// Dashboard Admin — FR-65, api-design mục 12. <see cref="Properties"/> và <see cref="Rooms"/> không tính khu trọ và
/// phòng đã lưu trữ.
/// </summary>
public record AdminDashboardResponse(
    UserCountsResponse Users,
    int Properties,
    int Rooms,
    int PendingLandlordApplications);

/// <summary>Số tài khoản, tính cả tài khoản đang bị khóa; mỗi tài khoản có đúng một vai trò.</summary>
public record UserCountsResponse(int Total, int Admins, int Landlords, int Tenants);

/// <summary>
/// Dashboard Chủ trọ — FR-66, api-design mục 12. <see cref="RoomCounts"/> không tính phòng đã lưu trữ; hóa đơn chưa thu,
/// doanh thu và việc cần xử lý vẫn tính cả phòng đã lưu trữ.
/// </summary>
public record LandlordDashboardResponse(
    RoomCountsResponse RoomCounts,
    UnpaidInvoicesResponse UnpaidInvoices,
    IReadOnlyList<MonthlyRevenueResponse> MonthlyRevenue,
    LandlordPendingActionsResponse PendingActions);

/// <summary>Số hóa đơn còn phải thu và tổng phần còn phải trả (tổng tiền trừ đã thu) của chúng.</summary>
public record UnpaidInvoicesResponse(int Count, decimal Amount);

/// <summary>Doanh thu đã xác nhận của một tháng; <see cref="Month"/> dạng <c>yyyy-MM</c> theo giờ Việt Nam.</summary>
public record MonthlyRevenueResponse(string Month, decimal Amount);

/// <summary>
/// Việc cần xử lý của Chủ trọ (api-design mục 12) — chỉ là số đếm, giao diện dẫn tới danh sách tương ứng. Việc đã quá
/// hạn mà không còn thao tác được (quá hạn duyệt, quá hạn giữ chỗ) không tính, dù tác vụ định kỳ chưa kịp chuyển trạng
/// thái. <see cref="InvoicesToCreate"/> bằng số dòng của danh sách Chốt số tháng này.
/// </summary>
public record LandlordPendingActionsResponse(
    int RentalRequests,
    int PaymentReports,
    int ContractsAwaitingDeposit,
    int ApprovedRentalRequests,
    int InvoicesToCreate,
    int OverdueInvoices,
    int NewMaintenanceRequests,
    int SettlementsToPrepare,
    int DepositsToRefund);

/// <summary>
/// Dashboard Người thuê — FR-68, api-design mục 12. <see cref="TotalPaid"/> là tổng đã được Chủ trọ xác nhận thu trên các
/// hóa đơn của người thuê, không tính tiền cọc.
/// </summary>
public record TenantDashboardResponse(
    IReadOnlyList<TenantDashboardContractResponse> Contracts,
    UnpaidInvoicesResponse UnpaidInvoices,
    decimal TotalPaid,
    TenantPendingActionsResponse PendingActions);

/// <summary>Hợp đồng chưa kết thúc (khác Đã thanh lý, Đã hủy) của người thuê.</summary>
public record TenantDashboardContractResponse(
    long Id,
    string RoomCode,
    string PropertyName,
    ContractStatus Status,
    DateOnly StartDate,
    DateOnly EndDate,
    decimal RentPrice);

/// <summary>
/// Việc cần xử lý của Người thuê (api-design mục 12). Hợp đồng đã quá hạn giữ chỗ không tính, dù tác vụ định kỳ chưa kịp
/// hủy; <see cref="InvoicesToPay"/> không gồm hóa đơn Chờ xác nhận — đã báo thanh toán, đang chờ Chủ trọ.
/// </summary>
public record TenantPendingActionsResponse(
    int ContractsToConfirm,
    int SettlementsToConfirm,
    int InvoicesToPay,
    int DepositsToTransfer,
    int MaintenanceToConfirm);
