import type { InvoiceStatus, InvoiceType } from '@/types/invoiceTypes'

/**
 * Hóa đơn hoàn cọc: hóa đơn thanh lý số dư âm, là tiền Chủ trọ hoàn nên không có khoản thu nào. Hóa đơn thanh lý
 * số dư dương vẫn trả từng phần được (`ThanhToanMotPhan`, `QuaHan`), nên vẫn hiện "Đã thu x / y".
 */
export function isRefundInvoice(invoice: { type: InvoiceType; totalAmount: number }): boolean {
  return invoice.type === 'ThanhLy' && invoice.totalAmount < 0
}

/**
 * Mã trạng thái đưa vào `StatusBadge kind="invoice"`. Hóa đơn thanh lý có số dư âm (Chủ trọ hoàn phần cọc dư)
 * đã xong thì server để `DaThanhToan`, nhưng nhãn "Đã thanh toán" đọc như người thuê vừa trả tiền; giao diện
 * đổi sang mã `DaHoanCoc` chỉ dùng để hiển thị ("Đã hoàn cọc", docs/design-system.md mục 7). Mã khác giữ nguyên.
 */
export function getInvoiceDisplayStatus(invoice: {
  type: InvoiceType
  status: InvoiceStatus
  totalAmount: number
}): string {
  if (isRefundInvoice(invoice) && invoice.status === 'DaThanhToan') {
    return 'DaHoanCoc'
  }
  return invoice.status
}
