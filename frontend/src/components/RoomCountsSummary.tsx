import { cn } from '@/lib/utils'
import type { RoomCounts } from '@/types/propertyTypes'
import { getStatusDisplay } from '@/utils/statusLabels'

// Thứ tự và nhãn theo trạng thái khai thác của phòng (docs/design-system.md mục 7); nhãn lấy từ
// file nhãn trạng thái, không viết lại ở đây.
const COUNT_FIELDS = [
  { key: 'trong', status: 'Trong' },
  { key: 'dangGiuCho', status: 'DangGiuCho' },
  { key: 'dangThue', status: 'DangThue' },
  { key: 'baoTri', status: 'BaoTri' },
] as const satisfies readonly { key: keyof RoomCounts; status: string }[]

interface RoomCountsSummaryProps {
  counts: RoomCounts
  /** `inline`: một dòng chữ cho danh sách; `tiles`: các ô số cho trang chi tiết. */
  variant?: 'inline' | 'tiles'
  className?: string
}

/** Số phòng của khu trọ theo trạng thái khai thác; không tính phòng đã lưu trữ (docs/api-design.md mục 5.1). */
export default function RoomCountsSummary({ counts, variant = 'inline', className }: RoomCountsSummaryProps) {
  if (variant === 'tiles') {
    return (
      <dl className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5', className)}>
        <CountTile label="Tổng số phòng" value={counts.total} />
        {COUNT_FIELDS.map(({ key, status }) => (
          <CountTile key={key} label={getStatusDisplay('roomOccupancy', status).label} value={counts[key]} />
        ))}
      </dl>
    )
  }

  if (counts.total === 0) {
    return <p className={cn('text-sm text-muted-foreground', className)}>Chưa có phòng</p>
  }

  // Chỉ kể các trạng thái đang có phòng để dòng chữ ngắn, vừa màn 360px.
  const parts = COUNT_FIELDS.filter(({ key }) => counts[key] > 0).map(
    ({ key, status }) => `${getStatusDisplay('roomOccupancy', status).label} ${counts[key]}`,
  )

  return (
    <div className={cn('flex flex-col gap-0.5 text-sm', className)}>
      <p className="font-medium tabular-nums">{counts.total} phòng</p>
      <p className="text-muted-foreground tabular-nums">{parts.join(' · ')}</p>
    </div>
  )
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
