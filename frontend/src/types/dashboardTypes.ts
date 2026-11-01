import type { RoomCounts } from '@/types/propertyTypes'

/** Hóa đơn còn phải thu: số hóa đơn và tổng phần còn phải trả (docs/api-design.md mục 12). */
export interface UnpaidInvoices {
  count: number
  amount: number
}

/** Doanh thu đã xác nhận của một tháng; `month` dạng `yyyy-MM` theo giờ Việt Nam. */
export interface MonthlyRevenue {
  month: string
  amount: number
}

/** Việc cần xử lý của Chủ trọ — chỉ là số đếm, giao diện dẫn tới danh sách tương ứng. */
export interface LandlordPendingActions {
  rentalRequests: number
  paymentReports: number
  contractsAwaitingDeposit: number
}

/**
 * `GET /dashboard/landlord`. `roomCounts` không tính phòng đã lưu trữ; `monthlyRevenue` luôn đủ 6 tháng
 * từ tháng cũ tới tháng hiện tại, tháng không có khoản thu ghi 0.
 */
export interface LandlordDashboard {
  roomCounts: RoomCounts
  unpaidInvoices: UnpaidInvoices
  monthlyRevenue: MonthlyRevenue[]
  pendingActions: LandlordPendingActions
}
