import { cn } from '@/lib/utils'
import { formatCurrency } from '@/utils/formatCurrency'
import { getSettlementBalance } from '@/utils/getSettlementBalance'

interface MoneyTextProps {
  amount: number
  /**
   * Số dư của hóa đơn thanh lý: hiện kèm chiều bằng chữ, dương là "Người thuê còn phải trả",
   * âm là "Chủ trọ phải hoàn" (FR-58). Số tiền hiện dạng dương, không có dấu trừ.
   */
  settlementBalance?: boolean
  className?: string
}

/** Số tiền đồng, các chữ số thẳng cột (`tabular-nums`). */
export default function MoneyText({ amount, settlementBalance = false, className }: MoneyTextProps) {
  if (!settlementBalance) {
    return <span className={cn('tabular-nums', className)}>{formatCurrency(amount)}</span>
  }

  const { label, amount: absoluteAmount } = getSettlementBalance(amount)
  return (
    <span className="inline-flex flex-col">
      {label && <span className="text-sm font-normal text-muted-foreground">{label}</span>}
      <span className={cn('tabular-nums', className)}>{formatCurrency(absoluteAmount)}</span>
    </span>
  )
}
