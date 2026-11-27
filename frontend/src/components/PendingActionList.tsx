import { ChevronRight, CircleCheck } from 'lucide-react'
import { Link } from 'react-router'

export interface PendingActionItem {
  /** Danh sách đã lọc đúng trạng thái, bộ lọc nằm trên query của URL. */
  to: string
  count: number
  title: string
  /** Câu phụ nói việc cần làm. */
  hint: string
  /** Động từ hành động: "Duyệt", "Xác nhận", "Xem". */
  verb: string
}

interface PendingActionListProps {
  items: PendingActionItem[]
}

/**
 * Khối Việc cần xử lý của dashboard (docs/design-system.md mục 5): mỗi việc có số khác 0 một dòng gồm ô số, tên
 * việc, câu phụ, động từ và mũi tên; cả dòng là liên kết. Việc số 0 không hiện, để khối chỉ còn việc đang chờ;
 * mọi số bằng 0 thì khối hiện một dòng "Không có việc nào đang chờ bạn".
 */
export default function PendingActionList({ items }: PendingActionListProps) {
  const activeItems = items.filter((item) => item.count > 0)
  const total = activeItems.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="overflow-hidden rounded-xl border border-highlight-soft bg-card">
      <div className="flex items-center justify-between gap-3 bg-highlight-soft/40 px-4 py-3">
        <h2 className="text-lg font-bold">Việc cần xử lý</h2>
        <span className="text-sm text-muted-foreground tabular-nums">{total} việc</span>
      </div>
      {activeItems.length === 0 ? (
        <p className="flex min-h-14 items-center gap-3 border-t border-highlight-soft px-4 py-2.5 text-muted-foreground">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-muted">
            <CircleCheck className="size-5" strokeWidth={1.75} />
          </span>
          Không có việc nào đang chờ bạn.
        </p>
      ) : (
        <ul className="bg-highlight-soft/40">
          {activeItems.map((item) => (
            <li key={item.to} className="border-t border-highlight-soft">
              <Link
                to={item.to}
                className="grid min-h-14 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 outline-none transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <span className="grid size-10 place-items-center rounded-[10px] bg-highlight-soft text-lg font-extrabold text-highlight-soft-foreground tabular-nums">
                  {item.count}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold">{item.title}</span>
                  <span className="text-sm text-muted-foreground">{item.hint}</span>
                </span>
                <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                  <span className="hidden sm:inline">{item.verb}</span>
                  <ChevronRight aria-hidden="true" className="size-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
