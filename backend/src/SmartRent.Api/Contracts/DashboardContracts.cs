namespace SmartRent.Api.Contracts;

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
/// Việc cần xử lý — chỉ là số đếm, giao diện dẫn tới danh sách tương ứng. Yêu cầu thuê đã quá hạn duyệt và hợp đồng
/// đã quá hạn giữ chỗ không tính, dù tác vụ định kỳ chưa kịp chuyển trạng thái.
/// </summary>
public record LandlordPendingActionsResponse(int RentalRequests, int PaymentReports, int ContractsAwaitingDeposit);
