import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

export interface PendingActionItem {
  /** Danh sách đã lọc đúng trạng thái, bộ lọc nằm trên query của URL. */
  to: string
  count: number
  title: string
  /** Câu phụ khi có việc. */
  hint: string
  /** Câu phụ khi số bằng 0, dạng "Không có … nào". */
  emptyHint: string
  /** Động từ hành động: "Duyệt", "Xác nhận", "Xem". */
  verb: string
}

interface PendingActionListProps {
  items: PendingActionItem[]
}

/**
 * Khối Việc cần xử lý của dashboard (docs/design-system.md mục 5): mỗi dòng một ô số, tên việc, câu phụ,
 * động từ và mũi tên; cả dòng là liên kết. Việc có số 0 vẫn hiện với ô số màu xám để người dùng biết đã
 * xong; số khác 0 dùng màu nhấn.
 */
export default function PendingActionList({ items }: PendingActionListProps) {
  const total = items.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="overflow-hidden rounded-xl border border-highlight-soft bg-card">
      <div className="flex items-center justify-between gap-3 bg-highlight-soft/40 px-4 py-3">
        <h2 className="text-lg font-bold">Việc cần xử lý</h2>
        <span className="text-sm text-muted-foreground tabular-nums">{total} việc</span>
      </div>
      <ul className="bg-highlight-soft/40">
        {items.map((item) => {
          const hasWork = item.count > 0
          return (
            <li key={item.to} className="border-t border-highlight-soft">
              <Link
                to={item.to}
                className="grid min-h-14 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 outline-none transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <span
                  className={cn(
                    'grid size-10 place-items-center rounded-[10px] text-lg tabular-nums',
                    hasWork
                      ? 'bg-highlight-soft font-extrabold text-highlight-soft-foreground'
                      : 'bg-muted font-semibold text-muted-foreground',
                  )}
                >
                  {item.count}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold">{item.title}</span>
                  <span className="text-sm text-muted-foreground">{hasWork ? item.hint : item.emptyHint}</span>
                </span>
                <span
                  className={cn(
                    'flex items-center gap-1 text-sm',
                    hasWork ? 'font-semibold text-primary' : 'text-muted-foreground',
                  )}
                >
                  <span className="hidden sm:inline">{item.verb}</span>
                  <ChevronRight aria-hidden="true" className="size-4" />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
