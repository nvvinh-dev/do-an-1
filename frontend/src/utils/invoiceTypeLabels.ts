import type { InvoiceType } from '@/types/invoiceTypes'

const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  DinhKy: 'Hóa đơn định kỳ',
  ThanhLy: 'Hóa đơn thanh lý',
}

/** Nhãn tiếng Việt của loại hóa đơn (L6, L8, T5), như `paymentMethodLabels.ts`. */
export function getInvoiceTypeLabel(type: InvoiceType): string {
  return INVOICE_TYPE_LABELS[type]
}
