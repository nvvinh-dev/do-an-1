import { formatCompactCurrency } from '@/utils/formatCompactCurrency'
import { formatCurrency } from '@/utils/formatCurrency'

/** Số tiền rút gọn cho thẻ chỉ số ("12,5 tr"); trình đọc màn hình đọc số đầy đủ. */
export default function CompactMoneyText({ amount }: { amount: number }) {
  return (
    <>
      <span aria-hidden="true">{formatCompactCurrency(amount)}</span>
      <span className="sr-only">{formatCurrency(amount)}</span>
    </>
  )
}
