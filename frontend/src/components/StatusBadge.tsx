import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getStatusDisplay, type StatusKind, type StatusTone } from '@/utils/statusLabels'

// Chỗ duy nhất được dùng màu Tailwind trực tiếp (docs/design-system.md mục 2 và 7). Viết đủ tên
// class, không ghép chuỗi, để Tailwind tìm thấy khi quét file.
const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
  danger: 'border-red-200 bg-red-50 text-red-700',
}

interface StatusBadgeProps {
  /** Loại đối tượng có trạng thái: cùng mã `DaHuy` nhưng nhãn và tông có thể khác theo loại. */
  kind: StatusKind
  /** Mã trạng thái đúng như API trả về, ví dụ `ChoDuyet`. */
  status: string
  className?: string
}

/** Nhãn tiếng Việt có dấu và màu của một trạng thái; luôn có chữ, không chỉ có màu. */
export default function StatusBadge({ kind, status, className }: StatusBadgeProps) {
  const { label, tone } = getStatusDisplay(kind, status)

  return (
    <Badge variant="outline" className={cn(TONE_CLASSES[tone], className)}>
      {label}
    </Badge>
  )
}
