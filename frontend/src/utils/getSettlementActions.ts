import type { ContractStatus } from '@/types/contractTypes'
import type { InvoiceDetail, InvoiceStatus } from '@/types/invoiceTypes'

/** Người thuê có 7 ngày (168 giờ) kể từ lần gửi gần nhất để phản hồi, quá hạn thì Chủ trọ tự chốt (FR-95). */
const SETTLEMENT_RESPONSE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

/** Bảng đã khóa: người thuê đồng ý hoặc Chủ trọ tự chốt; từ đây chỉ còn thu tiền hoặc hoàn cọc (FR-57). */
const LOCKED_STATUSES: readonly InvoiceStatus[] = [
  'ChuaThanhToan',
  'ChoXacNhan',
  'ThanhToanMotPhan',
  'QuaHan',
  'DaThanhToan',
  'ChoHoanCoc',
]

export interface SettlementActions {
  /** Hợp đồng đang thanh lý mà chưa có bảng: hiện form lập. */
  canCreate: boolean
  /** Nháp: sửa và gửi cho người thuê. */
  canEdit: boolean
  canSend: boolean
  /** Thời điểm đủ 7 ngày từ lần gửi gần nhất; `null` khi bảng không chờ người thuê. */
  finalizeAllowedAfter: Date | null
  canFinalize: boolean
  isLocked: boolean
  /** Bảng đã khóa mà hợp đồng chưa thanh lý xong. */
  canComplete: boolean
  /** Hoàn tất phải kèm ngày và hình thức hoàn cọc (số dư âm). */
  needsRefund: boolean
}

/**
 * Nút ở L9 theo bảng "L9 — thao tác theo trạng thái" (docs/frontend-screens.md mục 6), cùng điều kiện với
 * `Invoice.CanFinalizeSettlement` ở backend: tự chốt khi đã qua mốc `sentAt` + 7 ngày, đúng mốc thì chưa.
 * Hợp đồng đã thanh lý thì chỉ xem. Ẩn nút chỉ để trải nghiệm; server vẫn trả `409` khi sai trạng thái.
 */
export function getSettlementActions(
  contractStatus: ContractStatus,
  invoice: Pick<InvoiceDetail, 'status' | 'sentAt'> | null,
  now: Date,
): SettlementActions {
  const isSettling = contractStatus === 'DangThanhLy'
  const isDraft = invoice?.status === 'Nhap'
  const isAwaitingTenant = invoice?.status === 'ChoNguoiThueXacNhan'
  const finalizeAllowedAfter =
    isAwaitingTenant && invoice.sentAt !== null
      ? new Date(new Date(invoice.sentAt).getTime() + SETTLEMENT_RESPONSE_WINDOW_MS)
      : null
  const isLocked = invoice !== null && LOCKED_STATUSES.includes(invoice.status)

  return {
    canCreate: isSettling && invoice === null,
    canEdit: isSettling && isDraft,
    canSend: isSettling && isDraft,
    finalizeAllowedAfter,
    canFinalize: isSettling && finalizeAllowedAfter !== null && now.getTime() > finalizeAllowedAfter.getTime(),
    isLocked,
    canComplete: isSettling && isLocked,
    needsRefund: isSettling && invoice?.status === 'ChoHoanCoc',
  }
}
