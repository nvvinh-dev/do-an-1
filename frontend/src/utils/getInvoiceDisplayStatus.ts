import type { InvoiceStatus, InvoiceType } from '@/types/invoiceTypes'

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
  if (invoice.type === 'ThanhLy' && invoice.totalAmount < 0 && invoice.status === 'DaThanhToan') {
    return 'DaHoanCoc'
  }
  return invoice.status
}
