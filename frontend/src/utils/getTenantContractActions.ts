import type { ContractStatus } from '@/types/contractTypes'
import { isHoldExpired } from '@/utils/isHoldExpired'

interface TenantContractActions {
  /** Nút **Đồng ý** (`POST /contracts/{id}/confirm`). */
  canConfirm: boolean
  /** Nút **Yêu cầu sửa** (`POST /contracts/{id}/request-changes`). */
  canRequestChanges: boolean
  /** Nút **Hủy hợp đồng** (`POST /contracts/{id}/cancel`). */
  canCancel: boolean
}

/**
 * Nút Người thuê thấy trên hợp đồng, theo bảng T4 (docs/frontend-screens.md mục 5). Đồng ý và yêu
 * cầu sửa chỉ mở ở `ChoNguoiThueXacNhan` khi chưa quá hạn giữ chỗ (api-design mục 8): quá hạn mà
 * tác vụ định kỳ chưa kịp hủy thì server vẫn trả trạng thái này nhưng đã trả `409`. Hủy mở ở mọi
 * trạng thái chưa hiệu lực, kể cả khi quá hạn giữ chỗ vì `/cancel` không chặn theo hạn này, và ở
 * `DangHieuLuc` khi hôm nay còn trước `startDate` (FR-76); từ ngày bắt đầu, hợp đồng chỉ kết thúc
 * qua thanh lý. Chỉ để ẩn nút: server vẫn kiểm tra lại và trả `409` khi không hợp lệ.
 *
 * @param today Hôm nay theo giờ Việt Nam dạng `YYYY-MM-DD` (`getVietnamToday`), cùng dạng với `startDate`
 * nên so sánh chuỗi trực tiếp được.
 * @param now Thời điểm hiện tại, để so với `holdExpiresAt`.
 */
export function getTenantContractActions(
  contract: { status: ContractStatus; startDate: string; holdExpiresAt: string | null },
  today: string,
  now: Date,
): TenantContractActions {
  const isAwaitingTenant = contract.status === 'ChoNguoiThueXacNhan' && !isHoldExpired(contract.holdExpiresAt, now)
  const isNotActiveYet =
    contract.status === 'Nhap' || contract.status === 'ChoNguoiThueXacNhan' || contract.status === 'ChoNhanCoc'
  const isActiveBeforeStart = contract.status === 'DangHieuLuc' && today < contract.startDate

  return {
    canConfirm: isAwaitingTenant,
    canRequestChanges: isAwaitingTenant,
    canCancel: isNotActiveYet || isActiveBeforeStart,
  }
}
