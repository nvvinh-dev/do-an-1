import { MapPin } from 'lucide-react'
import { Link } from 'react-router'
import PropertyCoverImage from '@/components/PropertyCoverImage'
import StatusBadge from '@/components/StatusBadge'
import { cn } from '@/lib/utils'
import type { PropertyListItem } from '@/types/propertyTypes'
import { formatPropertyAddress } from '@/utils/formatPropertyAddress'
import { getStatusDisplay } from '@/utils/statusLabels'

// Thứ tự trạng thái trên dòng chữ; trạng thái có màu thì cũng là một đoạn trên thanh tỷ lệ
// (docs/design-system.md mục 2 `chart-*`, mục 11 thẻ khu trọ).
const ROOM_PARTS = [
  { key: 'dangThue', status: 'DangThue', barClass: 'bg-chart-1' },
  { key: 'dangGiuCho', status: 'DangGiuCho', barClass: 'bg-chart-3' },
  { key: 'trong', status: 'Trong', barClass: null },
  { key: 'baoTri', status: 'BaoTri', barClass: null },
] as const

interface PropertyCardProps {
  property: PropertyListItem
}

/**
 * Thẻ khu trọ có ảnh (docs/design-system.md mục 11): ảnh 16:9 kèm trạng thái, tên, địa chỉ, thanh tỷ
 * lệ phòng và số phòng theo trạng thái bằng chữ. Cả thẻ dẫn tới chi tiết khu trọ (L2).
 */
export default function PropertyCard({ property }: PropertyCardProps) {
  const { roomCounts } = property
  const parts = ROOM_PARTS.filter(({ key }) => roomCounts[key] > 0)

  return (
    <Link
      to={`/landlord/properties/${property.id}`}
      className="flex h-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative">
        <PropertyCoverImage
          src={property.coverImageUrl}
          alt={`Ảnh đại diện khu trọ ${property.name}`}
          aspect="wide"
          missingText="Chưa có ảnh khu trọ"
          className={cn(property.status === 'LuuTru' && 'opacity-60')}
        />
        <StatusBadge kind="property" status={property.status} className="absolute top-2.5 left-2.5" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="font-semibold wrap-anywhere">{property.name}</p>
        <p className="flex gap-1.5 text-sm text-muted-foreground">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          <span className="wrap-anywhere">{formatPropertyAddress(property)}</span>
        </p>
        {roomCounts.total === 0 ? (
          <p className="mt-auto text-sm text-muted-foreground">Chưa có phòng</p>
        ) : (
          <div className="mt-auto flex flex-col gap-2 pt-1">
            <div aria-hidden="true" className="flex h-1.5 overflow-hidden rounded-full bg-muted">
              {ROOM_PARTS.filter((part) => part.barClass !== null).map((part) => (
                <span
                  key={part.key}
                  className={part.barClass ?? undefined}
                  style={{ width: `${(roomCounts[part.key] / roomCounts.total) * 100}%` }}
                />
              ))}
            </div>
            <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground tabular-nums">
              {parts.map((part) => (
                <span key={part.key} className="inline-flex items-center gap-1.5">
                  {part.barClass && <span aria-hidden="true" className={cn('size-2 rounded-xs', part.barClass)} />}
                  <span>
                    <span className="font-semibold text-foreground">{roomCounts[part.key]}</span>{' '}
                    {getStatusDisplay('roomOccupancy', part.status).label.toLocaleLowerCase('vi-VN')}
                  </span>
                </span>
              ))}
            </p>
          </div>
        )}
      </div>
    </Link>
  )
}
