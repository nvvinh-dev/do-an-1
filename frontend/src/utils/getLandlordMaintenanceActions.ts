import type { MaintenanceRequestStatus } from '@/types/maintenanceRequestTypes'

/** Sự cố Mới quá số giờ này kể từ lúc gửi thì người thuê được nhắc liên hệ trực tiếp Chủ trọ (BP-08 A4). */
const ACCEPT_OVERDUE_HOURS = 72

const MS_PER_HOUR = 60 * 60 * 1000

interface LandlordMaintenanceActions {
  /** Nút **Tiếp nhận** (`POST /maintenance-requests/{id}/accept`). */
  canAccept: boolean
  /** Nút **Sửa ngày dự kiến** (`PATCH /maintenance-requests/{id}/expected-completion-date`). */
  canChangeExpectedCompletionDate: boolean
  /** Nút **Báo đã sửa xong** (`POST /maintenance-requests/{id}/complete`). */
  canComplete: boolean
  /** Nút **Từ chối** (`POST /maintenance-requests/{id}/reject`). */
  canReject: boolean
  /** Sự cố Mới đã quá 72 giờ chưa tiếp nhận: vẫn tiếp nhận được, chỉ hiện cảnh báo. */
  isAcceptOverdue: boolean
}

/**
 * Nút Chủ trọ thấy trên sự cố, theo bảng L11 (docs/frontend-screens.md mục 6) và vòng đời ở tài liệu
 * phân tích mục 8.6: tiếp nhận ở `Moi` (FR-140), sửa ngày dự kiến và báo sửa xong ở `DangXuLy`
 * (FR-140, FR-142), từ chối ở cả `Moi` lẫn `DangXuLy` (FR-141). Quá 72 giờ không chặn tiếp nhận; đúng
 * mốc chưa tính là quá hạn. Chỉ để ẩn nút: server vẫn kiểm tra lại.
 */
export function getLandlordMaintenanceActions(
  maintenanceRequest: { status: MaintenanceRequestStatus; createdAt: string },
  now: Date,
): LandlordMaintenanceActions {
  const isNew = maintenanceRequest.status === 'Moi'
  const isInProgress = maintenanceRequest.status === 'DangXuLy'
  const createdAt = new Date(maintenanceRequest.createdAt).getTime()
  const isAcceptOverdue =
    isNew && !Number.isNaN(createdAt) && now.getTime() > createdAt + ACCEPT_OVERDUE_HOURS * MS_PER_HOUR

  return {
    canAccept: isNew,
    canChangeExpectedCompletionDate: isInProgress,
    canComplete: isInProgress,
    canReject: isNew || isInProgress,
    isAcceptOverdue,
  }
}
