import type { ContractStatus, MoveOutNotice } from '@/types/contractTypes'

/** Bên đang xem hợp đồng, cùng giá trị với `MoveOutNotice.noticeBy`. */
export type ContractViewer = 'Landlord' | 'Tenant'

interface MoveOutNoticeActions {
  /** Nút **Gửi thông báo trả phòng** (`POST /contracts/{id}/move-out-notice`). */
  canSend: boolean
  /** Nút **Rút thông báo** (`POST /contracts/{id}/move-out-notice/withdraw`). */
  canWithdraw: boolean
}

interface ContractForMoveOutNotice {
  status: ContractStatus
  startDate: string
  moveOutNotice: MoveOutNotice | null
  settlementInvoiceId: number | null
}

/**
 * Nút thông báo trả phòng, giống nhau ở T4 và L6 (docs/frontend-screens.md mục 5, 6; api-design mục 10).
 * Gửi: `DangHieuLuc` từ ngày bắt đầu (trước đó kết thúc bằng hủy hợp đồng) hoặc `SapHetHan`. Rút: hợp
 * đồng `DangThanhLy`, người xem là bên đã gửi và chưa có bảng thanh lý (FR-98).
 *
 * Người thuê nhận `settlementInvoiceId = null` khi bảng còn Nháp chưa từng gửi, nên vẫn thấy nút rút
 * trong lúc Chủ trọ đã lập bảng; server trả `409` kèm lý do và trang tải lại. Chỉ để ẩn nút: server
 * vẫn kiểm tra lại.
 *
 * @param today Hôm nay theo giờ Việt Nam dạng `YYYY-MM-DD`, so sánh chuỗi trực tiếp với `startDate`.
 */
export function getMoveOutNoticeActions(
  contract: ContractForMoveOutNotice,
  viewer: ContractViewer,
  today: string,
): MoveOutNoticeActions {
  const { status } = contract

  return {
    canSend: (status === 'DangHieuLuc' && today >= contract.startDate) || status === 'SapHetHan',
    canWithdraw:
      status === 'DangThanhLy' &&
      contract.moveOutNotice?.noticeBy === viewer &&
      contract.settlementInvoiceId === null,
  }
}
