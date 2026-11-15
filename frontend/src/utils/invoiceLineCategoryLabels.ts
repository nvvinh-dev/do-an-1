import type { InvoiceLineCategory } from '@/types/invoiceTypes'

const INVOICE_LINE_CATEGORY_LABELS: Record<InvoiceLineCategory, string> = {
  CongNoKyTruoc: 'Công nợ kỳ trước',
  BoiThuongHuHong: 'Bồi thường hư hỏng',
  PhiPhat: 'Phí phạt',
  KhauTruTienCoc: 'Trừ tiền cọc',
  DieuChinhKhac: 'Điều chỉnh khác',
}

/** Nhãn tiếng Việt của loại dòng hóa đơn (L7, L8, L9, T5), như `invoiceTypeLabels.ts`. */
export function getInvoiceLineCategoryLabel(category: InvoiceLineCategory): string {
  return INVOICE_LINE_CATEGORY_LABELS[category]
}
