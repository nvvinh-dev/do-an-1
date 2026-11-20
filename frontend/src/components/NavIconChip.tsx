import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { tintClasses, type NavTint } from '@/utils/tintClasses'

export type { NavTint } from '@/utils/tintClasses'

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
