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
