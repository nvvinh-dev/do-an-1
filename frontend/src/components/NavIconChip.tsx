import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Sắc phụ của ô icon (docs/design-system.md mục 2); mỗi mục giữ một sắc ở mọi nơi. */
export type NavTint = 'teal' | 'sky' | 'violet' | 'indigo' | 'amber' | 'rose' | 'emerald' | 'slate'

// Viết đủ tên class để Tailwind tìm thấy khi quét mã nguồn.
const tintClasses: Record<NavTint, string> = {
  teal: 'bg-tint-teal-soft text-tint-teal',
  sky: 'bg-tint-sky-soft text-tint-sky',
  violet: 'bg-tint-violet-soft text-tint-violet',
  indigo: 'bg-tint-indigo-soft text-tint-indigo',
  amber: 'bg-tint-amber-soft text-tint-amber',
  rose: 'bg-tint-rose-soft text-tint-rose',
  emerald: 'bg-tint-emerald-soft text-tint-emerald',
  slate: 'bg-tint-slate-soft text-tint-slate',
}

interface NavIconChipProps {
  icon: LucideIcon
  tint: NavTint
  /** Mục đang chọn: ô nền `primary`, icon trắng. */
  active?: boolean
}

/** Ô icon 30px của một mục menu (docs/design-system.md mục 4). */
export default function NavIconChip({ icon: Icon, tint, active = false }: NavIconChipProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-[30px] shrink-0 place-items-center rounded-[9px] transition-colors',
        active ? 'bg-primary text-primary-foreground shadow-sm' : tintClasses[tint],
      )}
    >
      <Icon className="size-4" strokeWidth={2} />
    </span>
  )
}
