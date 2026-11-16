import type { ContractListItem } from '@/types/contractTypes'

/**
 * Hợp đồng Người thuê chọn được khi báo sự cố (FR-137): `DangHieuLuc`, `SapHetHan` đã tới
 * `startDate`, hoặc `DangThanhLy`. Danh sách hợp đồng không có `expectedMoveOutDate`, nên hợp đồng
 * đang thanh lý đã qua ngày trả phòng vẫn hiện; server kiểm tra lại và trả `409`.
 *
 * @param today Hôm nay theo giờ Việt Nam dạng `YYYY-MM-DD` (`getVietnamToday`), cùng dạng với
 * `startDate` nên so sánh chuỗi trực tiếp được.
 */
export function getReportableContracts(contracts: ContractListItem[], today: string): ContractListItem[] {
  return contracts.filter(
    (contract) =>
      ((contract.status === 'DangHieuLuc' || contract.status === 'SapHetHan') && contract.startDate <= today) ||
      contract.status === 'DangThanhLy',
  )
}
