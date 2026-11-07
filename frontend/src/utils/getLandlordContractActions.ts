import type { ContractStatus } from '@/types/contractTypes'
import { isHoldExpired } from '@/utils/isHoldExpired'

export interface LandlordContractActions {
  /** **Sửa** (→ form sửa, `PUT /contracts/{id}`). */
  canEdit: boolean
  /** **Gửi cho người thuê** (`/send`). */
  canSend: boolean
  /** **Thu hồi để sửa** (`/recall`). */
  canRecall: boolean
  /** **Xác nhận đã nhận cọc** (`/deposit/confirm`). */
  canConfirmDeposit: boolean
  /** **Hủy hợp đồng** (`/cancel`). */
  canCancel: boolean
  /** **Sửa chỉ số đầu** (`PATCH /initial-meter-readings`). */
  canEditInitialMeter: boolean
  /** **Ghi nhận hoàn cọc** (`/deposit/refund`). */
  canRecordRefund: boolean
  /** **Lập hóa đơn** (→ L7). */
  canCreateInvoice: boolean
  /** Hợp đồng đã hoặc đang có hóa đơn: hiện danh sách hóa đơn của hợp đồng. */
  showInvoices: boolean
}

/**
 * Hợp đồng đã hoặc đang có hóa đơn: từ lúc có hiệu lực tới khi thanh lý xong. Dùng cả để quyết định có
 * tải `GET /contracts/{id}/invoices` hay không, nên tách khỏi `getLandlordContractActions` (hàm đó cần
 * danh sách hóa đơn đã tải).
 */
export function canShowContractInvoices(status: ContractStatus): boolean {
  return status === 'DangHieuLuc' || status === 'SapHetHan' || status === 'DangThanhLy' || status === 'DaThanhLy'
}

interface ContractForActions {
  status: ContractStatus
  startDate: string
  holdExpiresAt: string | null
  depositRefundPending: boolean
}

/**
 * Nút Chủ trọ thấy trên hợp đồng, theo bảng "L6 — thao tác theo trạng thái" (docs/frontend-screens.md
 * mục 6). Quá hạn giữ chỗ mà tác vụ định kỳ chưa kịp hủy thì server vẫn trả trạng thái chưa hiệu lực
 * nhưng sửa, gửi, thu hồi, xác nhận cọc đã trả `409` (api-design mục 8, "Hạn giữ chỗ"); hủy thì vẫn
 * được vì `/cancel` không chặn theo hạn này. Chỉ để ẩn nút: server vẫn kiểm tra lại.
 *
 * @param today Hôm nay theo giờ Việt Nam dạng `YYYY-MM-DD`, so sánh chuỗi trực tiếp với `startDate`.
 * @param now Thời điểm hiện tại, để so với `holdExpiresAt`.
 * @param hasActiveInvoice Hợp đồng đã có hóa đơn nào khác `DaHuy` (chặn sửa chỉ số đầu, FR-90).
 */
export function getLandlordContractActions(
  contract: ContractForActions,
  today: string,
  now: Date,
  hasActiveInvoice: boolean,
): LandlordContractActions {
  const holdOpen = !isHoldExpired(contract.holdExpiresAt, now)
  const { status } = contract
  const isNotActiveYet = status === 'Nhap' || status === 'ChoNguoiThueXacNhan' || status === 'ChoNhanCoc'
  const isActive = status === 'DangHieuLuc'
  const hasStarted = today >= contract.startDate

  return {
    canEdit: status === 'Nhap' && holdOpen,
    canSend: status === 'Nhap' && holdOpen,
    canRecall: (status === 'ChoNguoiThueXacNhan' || status === 'ChoNhanCoc') && holdOpen,
    canConfirmDeposit: status === 'ChoNhanCoc' && holdOpen,
    canCancel: isNotActiveYet || (isActive && !hasStarted),
    canEditInitialMeter: isActive && !hasActiveInvoice,
    canRecordRefund: status === 'DaHuy' && contract.depositRefundPending,
    // Hóa đơn định kỳ lập từ ngày bắt đầu; khi đang thanh lý vẫn lập cho tháng trọn còn thiếu.
    canCreateInvoice: ((isActive || status === 'SapHetHan') && hasStarted) || status === 'DangThanhLy',
    showInvoices: canShowContractInvoices(status),
  }
}
