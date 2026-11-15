import type { PaymentMethod } from '@/types/paymentTypes'

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  TienMat: 'Tiền mặt',
  ChuyenKhoan: 'Chuyển khoản',
}

/** Nhãn tiếng Việt của hình thức tiền (nhận cọc, hoàn cọc, hoàn tất thanh lý). */
export function getPaymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method]
}
