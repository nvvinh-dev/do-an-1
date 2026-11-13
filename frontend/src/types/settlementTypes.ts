import type { PaymentMethod } from '@/types/paymentTypes'

/** Loại dòng Chủ trọ được gửi trong bảng thanh lý (docs/api-design.md mục 10). */
export type SettlementLineCategory = 'BoiThuongHuHong' | 'PhiPhat' | 'DieuChinhKhac'

export interface SettlementInvoiceLineRequest {
  category: SettlementLineCategory
  /** Bắt buộc, tối đa 500 ký tự (BR-22). */
  description: string
  /** Số đồng nguyên. `BoiThuongHuHong`, `PhiPhat` lớn hơn 0; `DieuChinhKhac` nhận cả số âm. */
  amount: number
  /** Ảnh hư hỏng (`purpose = AnhHuHong`), chỉ với `BoiThuongHuHong`. */
  evidencePath: string | null
  /** Hóa đơn trước cùng hợp đồng mà dòng `DieuChinhKhac` điều chỉnh sai sót (BR-16). */
  relatedInvoiceId: number | null
}

/**
 * Body của `POST` và `PUT /contracts/{id}/settlement-invoice`. Chỉ số cũ, kỳ và mọi số tiền do server tính.
 * `moveOutDate` dạng `YYYY-MM-DD`, không sau hôm nay (`409`) và không trước ngày bắt đầu hợp đồng (`422`).
 */
export interface SettlementInvoiceRequest {
  currentElectricityIndex: number
  currentWaterIndex: number
  moveOutDate: string
  electricityMeterPhotoPath: string | null
  waterMeterPhotoPath: string | null
  /** Tối đa 50 dòng. */
  lines: SettlementInvoiceLineRequest[]
}

/** Body của `POST /contracts/{id}/settlement-invoice/finalize`: ghi chú bắt buộc, tối đa 500 ký tự. */
export interface FinalizeSettlementRequest {
  note: string
}

/** Phòng sau thanh lý chỉ về Trống hoặc Bảo trì (FR-59). */
export type RoomNextStatus = 'Trong' | 'BaoTri'

/**
 * Body của `POST /contracts/{id}/settlement/complete`. `refundedAt`, `refundMethod` bắt buộc khi hóa đơn
 * thanh lý ở `ChoHoanCoc` và bị bỏ qua ở trường hợp khác; số tiền hoàn do server tính (FR-86).
 */
export interface CompleteSettlementRequest {
  roomNextStatus: RoomNextStatus
  refundedAt: string | null
  refundMethod: PaymentMethod | null
}
