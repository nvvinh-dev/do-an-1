import type { MaintenanceRequestStatus } from '@/types/maintenanceRequestTypes'

/** Sự cố chờ xác nhận quá số giờ này kể từ lần báo sửa xong gần nhất thì tự đóng (FR-144). */
const AUTO_CLOSE_HOURS = 168

const MS_PER_HOUR = 60 * 60 * 1000

interface TenantMaintenanceActions {
  /** Nút **Xác nhận đã khắc phục** (`POST /maintenance-requests/{id}/confirm`). */
  canConfirm: boolean
  /** Nút **Chưa đạt** (`POST /maintenance-requests/{id}/not-fixed`). */
  canReportNotFixed: boolean
  /** Nút **Hủy sự cố** (`POST /maintenance-requests/{id}/cancel`). */
  canCancel: boolean
  /** Đã quá 168 giờ chờ xác nhận mà tác vụ định kỳ chưa kịp tự đóng. */
  isAutoCloseOverdue: boolean
}

/**
 * Mốc hệ thống tự đóng sự cố chờ xác nhận: `completedAt` + 168 giờ (FR-144). `null` khi chưa báo
 * sửa xong.
 */
export function getMaintenanceAutoCloseAt(completedAt: string | null): Date | null {
  if (completedAt === null) {
    return null
  }
  const completed = new Date(completedAt).getTime()
  return Number.isNaN(completed) ? null : new Date(completed + AUTO_CLOSE_HOURS * MS_PER_HOUR)
}

/**
 * Nút Người thuê thấy trên sự cố, theo bảng T10 (docs/frontend-screens.md mục 5). Hủy mở ở `Moi` và
 * `DangXuLy` (FR-145). Ở `ChoNguoiThueXacNhan`, xác nhận luôn mở — quá 168 giờ server vẫn nhận, kết
 * quả giống tự đóng — còn chưa đạt chỉ mở khi chưa quá 168 giờ, vì sau mốc này server trả `409` dù
 * tác vụ định kỳ chưa chạy (FR-143). Đúng mốc chưa tính là quá hạn. Chỉ để ẩn nút: server vẫn kiểm
 * tra lại.
 */
export function getTenantMaintenanceActions(
  maintenanceRequest: { status: MaintenanceRequestStatus; completedAt: string | null },
  now: Date,
): TenantMaintenanceActions {
  const isAwaitingTenant = maintenanceRequest.status === 'ChoNguoiThueXacNhan'
  const autoCloseAt = getMaintenanceAutoCloseAt(maintenanceRequest.completedAt)
  const isAutoCloseOverdue = isAwaitingTenant && autoCloseAt !== null && now.getTime() > autoCloseAt.getTime()

  return {
    canConfirm: isAwaitingTenant,
    canReportNotFixed: isAwaitingTenant && !isAutoCloseOverdue,
    canCancel: maintenanceRequest.status === 'Moi' || maintenanceRequest.status === 'DangXuLy',
    isAutoCloseOverdue,
  }
}
