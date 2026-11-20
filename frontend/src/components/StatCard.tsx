import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { tintClasses, type NavTint } from '@/utils/tintClasses'

/** Một đoạn của thanh tỷ lệ: phần trăm độ dài và class màu (`bg-chart-1`, `bg-chart-3`). */
export interface StatCardBarSegment {
  percent: number
  className: string
}

interface StatCardProps {
  label: string
  icon: LucideIcon
  /** Sắc của ô icon; `highlight` cho chỉ số đang chờ người dùng xử lý (tiền chưa thu). */
  tint: NavTint | 'highlight'
  /** Số lớn, đã định dạng. */
  value: ReactNode
  /** Phần nhỏ đi sau số, ví dụ "/ 24". */
  valueSuffix?: string
  /** Dòng phụ dưới số. */
  footnote?: ReactNode
  /** `success`: dòng phụ báo mức tăng (chữ xanh, đậm). */
  footnoteTone?: 'default' | 'success'
  /** Thanh tỷ lệ trên nền `muted`, ví dụ phòng đang thuê và đang giữ chỗ. Chỉ để nhìn, số đã ghi bằng chữ. */
  bar?: StatCardBarSegment[]
  /** Có thì cả thẻ là liên kết. */
  to?: string
}

const iconClasses: Record<NavTint | 'highlight', string> = {
  ...tintClasses,
  highlight: 'bg-highlight-soft text-highlight',
}

/** Thẻ chỉ số của dashboard (docs/design-system.md mục 3, 4, 6.2). */
export default function StatCard({
  label,
  icon: Icon,
  tint,
  value,
  valueSuffix,
  footnote,
  footnoteTone = 'default',
  bar,
  to,
}: StatCardProps) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span aria-hidden="true" className={cn('grid size-9 shrink-0 place-items-center rounded-[10px]', iconClasses[tint])}>
          <Icon className="size-[18px]" strokeWidth={1.75} />
        </span>
      </div>
      <p className="text-2xl font-bold tracking-tight tabular-nums lg:text-[1.625rem]">
        {value}
        {valueSuffix && <span className="text-sm font-medium text-muted-foreground"> {valueSuffix}</span>}
      </p>
      {bar && (
        <div aria-hidden="true" className="flex h-1.5 overflow-hidden rounded-full bg-muted">
          {bar.map((segment, index) => (
            <span key={index} className={segment.className} style={{ width: `${segment.percent}%` }} />
          ))}
        </div>
      )}
      {footnote && (
        <p
          className={cn(
            'text-sm tabular-nums',
            footnoteTone === 'success' ? 'font-semibold text-success' : 'text-muted-foreground',
          )}
        >
          {footnote}
        </p>
      )}
    </>
  )

  const cardClass = 'flex h-full min-w-0 flex-col gap-1.5 rounded-xl border bg-card p-4 text-card-foreground shadow-sm lg:px-5'

  if (to) {
    return (
      <Link
        to={to}
        className={cn(cardClass, 'outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring')}
      >
        {content}
      </Link>
    )
  }
  return <div className={cardClass}>{content}</div>
}
