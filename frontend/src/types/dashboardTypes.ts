import type { ContractStatus } from '@/types/contractTypes'
import type { RoomCounts } from '@/types/propertyTypes'

/** Số tài khoản theo vai trò, tính cả tài khoản đang bị khóa; mỗi tài khoản có đúng một vai trò. */
export interface UserCounts {
  total: number
  admins: number
  landlords: number
  tenants: number
}

/** `GET /dashboard/admin`. `properties` và `rooms` không tính khu trọ, phòng đã lưu trữ. */
export interface AdminDashboard {
  users: UserCounts
  properties: number
  rooms: number
  pendingLandlordApplications: number
}

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

/**
 * Việc cần xử lý của Chủ trọ — chỉ là số đếm, giao diện dẫn tới danh sách tương ứng (docs/api-design.md mục 12).
 * `invoicesToCreate` là số dòng của danh sách Chốt số tháng này; `depositsToRefund` gồm hợp đồng `DaHuy` chưa hoàn
 * cọc và hóa đơn thanh lý `ChoHoanCoc`.
 */
export interface LandlordPendingActions {
  rentalRequests: number
  paymentReports: number
  contractsAwaitingDeposit: number
  approvedRentalRequests: number
  invoicesToCreate: number
  overdueInvoices: number
  newMaintenanceRequests: number
  settlementsToPrepare: number
  depositsToRefund: number
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

/** Hợp đồng chưa kết thúc (khác `DaThanhLy`, `DaHuy`) trên dashboard Người thuê. `startDate`, `endDate` là ngày thuần. */
export interface TenantDashboardContract {
  id: number
  roomCode: string
  propertyName: string
  status: ContractStatus
  startDate: string
  endDate: string
  rentPrice: number
}

/**
 * Việc cần xử lý của Người thuê (docs/api-design.md mục 12). `invoicesToPay` không gồm hóa đơn `ChoXacNhan` — đã
 * báo thanh toán, đang chờ Chủ trọ.
 */
export interface TenantPendingActions {
  contractsToConfirm: number
  settlementsToConfirm: number
  invoicesToPay: number
  depositsToTransfer: number
  maintenanceToConfirm: number
}

/** `GET /dashboard/tenant`. `totalPaid` là tổng đã được Chủ trọ xác nhận thu, không tính tiền cọc. */
export interface TenantDashboard {
  contracts: TenantDashboardContract[]
  unpaidInvoices: UnpaidInvoices
  totalPaid: number
  pendingActions: TenantPendingActions
}
