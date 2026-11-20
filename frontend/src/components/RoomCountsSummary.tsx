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
  className?: string
}

/**
 * Các ô số phòng của khu trọ theo trạng thái khai thác ở trang chi tiết khu trọ; không tính phòng đã lưu
 * trữ (docs/api-design.md mục 5.1). Danh sách khu trọ dùng `PropertyCard` với thanh tỷ lệ thay cho dòng chữ.
 */
export default function RoomCountsSummary({ counts, className }: RoomCountsSummaryProps) {
  return (
    <dl className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5', className)}>
      <CountTile label="Tổng số phòng" value={counts.total} />
      {COUNT_FIELDS.map(({ key, status }) => (
        <CountTile key={key} label={getStatusDisplay('roomOccupancy', status).label} value={counts[key]} />
      ))}
    </dl>
  )
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  )
}
