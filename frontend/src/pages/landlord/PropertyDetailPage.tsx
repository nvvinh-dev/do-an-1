import { Archive, ChevronLeft, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import ConfirmDialog from '@/components/ConfirmDialog'
import PageHeader from '@/components/PageHeader'
import RoomCountsSummary from '@/components/RoomCountsSummary'
import StatusBadge from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useArchiveProperty } from '@/hooks/useArchiveProperty'
import { useProperty } from '@/hooks/useProperty'
import { isNotFoundError } from '@/lib/apiError'
import NotFoundPage from '@/pages/public/NotFoundPage'
import type { PropertyDetail } from '@/types/propertyTypes'
import { formatPropertyAddress } from '@/utils/formatPropertyAddress'

/**
 * L2 — Chi tiết khu trọ (docs/frontend-screens.md mục 6): thông tin, số phòng theo trạng thái,
 * nút sửa và lưu trữ. Khu đã lưu trữ chỉ còn xem được. Lưu trữ xong thì ở lại trang, hiện `toast`
 * và tải lại dữ liệu (mục 8).
 */
export default function PropertyDetailPage() {
  const { id } = useParams()
  // Id không phải số thì server trả 404 như khu không thuộc mình.
  const propertyId = Number(id)
  const propertyQuery = useProperty(propertyId)

  if (isNotFoundError(propertyQuery.error)) {
    return <NotFoundPage />
  }

  return (
    <section className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link to="/landlord/properties">
          <ChevronLeft />
          Khu trọ
        </Link>
      </Button>

      {propertyQuery.isPending ? (
        <PropertyDetailSkeleton />
      ) : propertyQuery.isError ? (
        <ApiErrorAlert error={propertyQuery.error} onRetry={() => void propertyQuery.refetch()} />
      ) : (
        <PropertyDetailContent property={propertyQuery.data} />
      )}
    </section>
  )
}

function PropertyDetailContent({ property }: { property: PropertyDetail }) {
  const isArchived = property.status === 'LuuTru'

  return (
    <>
      <PageHeader
        title={property.name}
        description={formatPropertyAddress(property)}
        action={!isArchived && <PropertyActions property={property} />}
      />

      {isArchived && (
        <Alert>
          <Archive />
          <AlertTitle>Khu trọ đã lưu trữ</AlertTitle>
          <AlertDescription>Khu trọ và các phòng của khu chỉ còn xem được, không sửa hay thêm phòng mới.</AlertDescription>
        </Alert>
      )}

      <RoomCountsSummary counts={property.roomCounts} variant="tiles" />

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6">
        <h2 className="text-lg font-medium">Thông tin khu trọ</h2>
        <dl className="grid gap-4 text-sm md:grid-cols-[10rem_1fr]">
          <dt className="text-muted-foreground">Trạng thái</dt>
          <dd>
            <StatusBadge kind="property" status={property.status} />
          </dd>

          <dt className="text-muted-foreground">Địa chỉ</dt>
          <dd className="wrap-anywhere">{formatPropertyAddress(property)}</dd>

          <dt className="text-muted-foreground">Mô tả</dt>
          <dd className="whitespace-pre-line wrap-anywhere">
            {property.description ?? <span className="text-muted-foreground">Chưa có mô tả</span>}
          </dd>

          <dt className="text-muted-foreground">Tiện ích chung</dt>
          <dd>
            {property.amenities.length === 0 ? (
              <span className="text-muted-foreground">Chưa chọn tiện ích</span>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {property.amenities.map((amenity) => (
                  <li key={amenity.id}>
                    <Badge variant="secondary">{amenity.name}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </dl>
      </div>

      {property.images.length > 0 && <PropertyImages property={property} />}
    </>
  )
}

function PropertyActions({ property }: { property: PropertyDetail }) {
  const archiveMutation = useArchiveProperty(property.id)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3 md:flex-row">
      <Button asChild variant="outline" size="page">
        <Link to={`/landlord/properties/${property.id}/edit`}>
          <Pencil />
          Sửa
        </Link>
      </Button>
      <Button type="button" variant="destructive" size="page" onClick={() => setConfirmOpen(true)}>
        <Archive />
        Lưu trữ
      </Button>

      {/* Còn phòng đang giữ chỗ hoặc đang thuê thì server trả 409; hộp thoại hiện `detail` (BR-10). */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Lưu trữ khu trọ"
        description={`Mọi phòng của "${property.name}" sẽ chuyển sang Lưu trữ và các yêu cầu thuê đang chờ duyệt bị từ chối. Khu trọ đã lưu trữ chỉ còn xem được, không bỏ lưu trữ được.`}
        confirmLabel="Lưu trữ"
        destructive
        isPending={archiveMutation.isPending}
        error={archiveMutation.error}
        onConfirm={() =>
          archiveMutation.mutate(undefined, {
            onSuccess: () => {
              setConfirmOpen(false)
              toast.success('Đã lưu trữ khu trọ')
            },
          })
        }
      />
    </div>
  )
}

function PropertyImages({ property }: { property: PropertyDetail }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6">
      <h2 className="text-lg font-medium">Ảnh khu trọ</h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {property.images.map((image, index) => (
          <li key={image.path} className="relative">
            <img
              src={image.url}
              alt={`Ảnh khu trọ ${property.name}, ảnh ${index + 1}`}
              className="aspect-4/3 w-full rounded-lg object-cover"
              loading="lazy"
            />
            {index === 0 && (
              <Badge variant="secondary" className="absolute top-2 left-2">
                Ảnh đại diện
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function PropertyDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  )
}
