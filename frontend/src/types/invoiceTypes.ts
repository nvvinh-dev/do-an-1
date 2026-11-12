import type { PaymentQr } from '@/types/paymentTypes'

/** Trạng thái hóa đơn, theo thứ tự trong vòng đời (docs/design-system.md mục 7). */
export const INVOICE_STATUSES = [
  'Nhap',
  'ChuaThanhToan',
  'ChoXacNhan',
  'ThanhToanMotPhan',
  'QuaHan',
  'DaThanhToan',
  'DaHuy',
  'DaChuyenThanhLy',
  'ChoNguoiThueXacNhan',
  'ChoHoanCoc',
] as const

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

/** `DinhKy`: hóa đơn hằng tháng; `ThanhLy`: hóa đơn thanh lý khi trả phòng. */
export type InvoiceType = 'DinhKy' | 'ThanhLy'

/** Một dòng của `GET /contracts/{contractId}/invoices` (docs/api-design.md mục 9), kỳ mới trước. */
export interface ContractInvoiceListItem {
  id: number
  type: InvoiceType
  /** Ngày thuần `YYYY-MM-DD`. */
  periodStart: string
  periodEnd: string
  totalAmount: number
  paidAmount: number
  status: InvoiceStatus
  issuedAt: string | null
  dueDate: string | null
}

/**
 * Loại dòng chi tiết. Chủ trọ chỉ gửi `BoiThuongHuHong`, `PhiPhat`, `DieuChinhKhac`; `CongNoKyTruoc` và
 * `KhauTruTienCoc` do server tự thêm vào hóa đơn thanh lý (docs/api-design.md mục 10).
 */
export type InvoiceLineCategory = 'CongNoKyTruoc' | 'BoiThuongHuHong' | 'PhiPhat' | 'KhauTruTienCoc' | 'DieuChinhKhac'

/** Một dòng của hóa đơn: số tiền dương là khoản phải thu, âm là khoản trừ. */
export interface InvoiceLine {
  category: InvoiceLineCategory
  description: string
  amount: number
  /** URL có chữ ký, hết hạn sau 1 giờ (docs/api-design.md mục 14). */
  evidenceUrl: string | null
  /** `path` đã lưu của ảnh hư hỏng, chỉ Chủ trọ sở hữu nhận; gửi lại khi sửa để giữ ảnh. */
  evidencePath: string | null
  relatedInvoiceId: number | null
}

export type PaymentReportStatus = 'ChoXacNhan' | 'DaXacNhan' | 'TuChoiXacNhan'

/** Một lượt người thuê báo đã thanh toán. */
export interface PaymentReport {
  id: number
  reportedAmount: number
  proofImageUrl: string
  reportedAt: string
  status: PaymentReportStatus
  confirmedAmount: number | null
  confirmedAt: string | null
  rejectReason: string | null
}

/**
 * Response của `GET /invoices/{id}` (docs/api-design.md mục 9), dùng chung cho hóa đơn định kỳ và hóa đơn
 * thanh lý. Các trường `...Path` chỉ có giá trị với Chủ trọ sở hữu; Người thuê nhận `null`.
 */
export interface InvoiceDetail {
  id: number
  contractId: number
  type: InvoiceType
  /** Ngày thuần `YYYY-MM-DD`. Hóa đơn thanh lý có `periodEnd` là ngày trả phòng thực tế. */
  periodStart: string
  periodEnd: string
  daysCharged: number
  daysInMonth: number
  previousElectricityIndex: number
  currentElectricityIndex: number
  electricityUnitPrice: number
  electricityAmount: number
  previousWaterIndex: number
  currentWaterIndex: number
  waterUnitPrice: number
  waterAmount: number
  rentAmount: number
  serviceFees: { name: string; amount: number }[]
  serviceFeeAmount: number
  totalAmount: number
  paidAmount: number
  status: InvoiceStatus
  issuedAt: string | null
  dueDate: string | null
  settledAt: string | null
  cancelReason: string | null
  electricityMeterPhotoUrl: string | null
  waterMeterPhotoUrl: string | null
  electricityMeterPhotoPath: string | null
  waterMeterPhotoPath: string | null
  lines: InvoiceLine[]
  paymentReports: PaymentReport[]
  paymentQr: PaymentQr | null
  /** Bốn trường sau chỉ có với hóa đơn thanh lý. `sentAt` là lần gửi gần nhất — mốc 7 ngày tự chốt. */
  sentAt: string | null
  tenantConfirmedAt: string | null
  changeRequestReason: string | null
  landlordFinalizeNote: string | null
}
