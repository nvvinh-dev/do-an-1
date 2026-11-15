import { cn } from '@/lib/utils'
import type { MonthlyRevenue } from '@/types/dashboardTypes'
import { formatCompactCurrency } from '@/utils/formatCompactCurrency'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatMonth, formatMonthShort } from '@/utils/formatMonth'

interface RevenueBarsProps {
  /** Các tháng từ cũ tới mới, như `monthlyRevenue` của `GET /dashboard/landlord`. */
  months: MonthlyRevenue[]
  className?: string
}

/**
 * Cột doanh thu theo tháng, cột cao theo tỷ lệ với tháng cao nhất (docs/design-system.md mục 6.2).
 * Số trên cột ghi đủ từ `md`; dưới `md` cột quá hẹp nên ghi rút gọn ("5,3 tr"), số đầy đủ vẫn có
 * cho trình đọc màn hình.
 */
export default function RevenueBars({ months, className }: RevenueBarsProps) {
  const maxAmount = Math.max(0, ...months.map((month) => month.amount))

  return (
    <ol className={cn('grid h-56 auto-cols-fr grid-flow-col gap-2 md:gap-4', className)}>
      {months.map((month) => {
        // Tháng có thu mà quá nhỏ so với tháng cao nhất vẫn hiện một vạch, để khác tháng 0 đồng.
        const heightPercent = maxAmount === 0 ? 0 : Math.max((month.amount / maxAmount) * 100, month.amount > 0 ? 2 : 0)

        return (
          <li key={month.month} className="flex min-w-0 flex-col items-center gap-1">
            <span className="sr-only">
              Tháng {formatMonth(month.month)}: {formatCurrency(month.amount)}
            </span>
            {/* `pt-5` chừa chỗ cho số của tháng cao nhất, nằm ngay trên đỉnh cột. */}
            <div aria-hidden className="w-full flex-1 pt-5">
              <div className="relative h-full">
                <div
                  className="absolute inset-x-0 bottom-0 mx-auto max-w-12 rounded-t-md bg-primary"
                  style={{ height: `${heightPercent}%` }}
                />
                <span
                  className="absolute inset-x-0 text-center text-xs font-medium whitespace-nowrap tabular-nums"
                  style={{ bottom: `calc(${heightPercent}% + 0.25rem)` }}
                >
                  <span className="md:hidden">{formatCompactCurrency(month.amount)}</span>
                  <span className="hidden md:inline">{formatCurrency(month.amount)}</span>
                </span>
              </div>
            </div>
            <span aria-hidden className="text-xs text-muted-foreground">
              {formatMonthShort(month.month)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
