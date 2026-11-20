import { ChevronRight, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

export interface QuickAction {
  label: string
  to: string
  icon: LucideIcon
}

interface QuickActionListProps {
  actions: QuickAction[]
}

/** Thao tác nhanh của dashboard: chỉ là lối tắt tới màn đã có (docs/design-system.md mục 5). */
export default function QuickActionList({ actions }: QuickActionListProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-bold">Thao tác nhanh</h2>
      <ul className="flex flex-col gap-2">
        {actions.map((action) => (
          <li key={action.to}>
            <Link
              to={action.to}
              className="flex min-h-11 items-center gap-3 rounded-lg border bg-card px-3 font-medium outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <action.icon aria-hidden="true" className="size-4 text-primary" />
              <span className="flex-1">{action.label}</span>
              <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
