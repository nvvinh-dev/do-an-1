import { Archive, ChevronLeft, Pencil } from 'lucide-react'
import { Link, useParams } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import MoneyText from '@/components/MoneyText'
import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRoom } from '@/hooks/useRoom'
import { isNotFoundError } from '@/lib/apiError'
import NotFoundPage from '@/pages/public/NotFoundPage'
import type { RoomDetail } from '@/types/roomTypes'

/** L3 — thông tin phòng ở góc nhìn quản lý (API mục 5.2). */
export default function LandlordRoomDetailPage() {
  const { id } = useParams()
  const query = useRoom(Number(id))
  if (isNotFoundError(query.error)) return <NotFoundPage />
  if (query.isPending)
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Đang tải phòng">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  if (query.isError) return <ApiErrorAlert error={query.error} onRetry={() => void query.refetch()} />
  return <RoomDetailContent room={query.data} />
}

function RoomDetailContent({ room }: { room: RoomDetail }) {
  const isArchived = room.occupancyStatus === 'LuuTru'
  return (
    <section className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link to={`/landlord/properties/${room.propertyId}`}>
          <ChevronLeft />
          Về khu trọ
        </Link>
      </Button>
      <PageHeader
        title={`Phòng ${room.code}`}
        description={room.propertyName}
        action={
          !isArchived && (
            <Button asChild size="page">
              <Link to={`/landlord/rooms/${room.id}/edit`}>
                <Pencil />
                Sửa phòng
              </Link>
            </Button>
          )
        }
      />
      {isArchived && (
        <Alert>
          <Archive />
          <AlertTitle>Phòng đã lưu trữ</AlertTitle>
          <AlertDescription>Phòng chỉ còn xem được, không sửa thông tin.</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge kind="roomOccupancy" status={room.occupancyStatus} />
        <StatusBadge kind="roomVisibility" status={room.visibilityStatus} />
        <p className="text-sm text-muted-foreground">
          {room.isListed ? 'Phòng đang xuất hiện trong tìm kiếm.' : 'Phòng không xuất hiện trong tìm kiếm.'}
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm md:p-6">
          <h2 className="text-lg font-semibold">Thông tin phòng</h2>
          <dl className="grid gap-3 md:grid-cols-[10rem_1fr]">
            <dt className="text-muted-foreground">Diện tích</dt>
            <dd>{room.area.toLocaleString('vi-VN')} m²</dd>
            <dt className="text-muted-foreground">Số người tối đa</dt>
            <dd>{room.maxOccupants} người</dd>
            <dt className="text-muted-foreground">Mô tả</dt>
            <dd className="whitespace-pre-line wrap-anywhere">{room.description || 'Chưa có mô tả'}</dd>
            <dt className="text-muted-foreground">Tiện ích phòng</dt>
            <dd>
              {room.amenities.length === 0 ? (
                'Chưa chọn tiện ích'
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {room.amenities.map((amenity) => (
                    <li key={amenity.id}>
                      <Badge variant="secondary">{amenity.name}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </dd>
            {room.currentContractId !== null && (
              <>
                <dt className="text-muted-foreground">Hợp đồng hiện tại</dt>
                <dd>
                  <Link
                    to={`/landlord/contracts/${room.currentContractId}`}
                    className="text-primary underline underline-offset-4"
                  >
                    Xem hợp đồng #{room.currentContractId}
                  </Link>
                </dd>
              </>
            )}
          </dl>
        </section>
        <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm md:p-6">
          <h2 className="text-lg font-semibold">Giá và phí hiện hành</h2>
          <dl className="grid gap-3 md:grid-cols-[1fr_auto]">
            <dt className="text-muted-foreground">Giá thuê / tháng</dt>
            <dd>
              <MoneyText amount={room.rentPrice} />
            </dd>
            <dt className="text-muted-foreground">Điện / kWh</dt>
            <dd>
              <MoneyText amount={room.electricityUnitPrice} />
            </dd>
            <dt className="text-muted-foreground">Nước / m³</dt>
            <dd>
              <MoneyText amount={room.waterUnitPrice} />
            </dd>
          </dl>
          <h3 className="font-medium">Phí dịch vụ mỗi kỳ</h3>
          {room.serviceFees.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có phí dịch vụ cố định.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {room.serviceFees.map((fee) => (
                <li key={fee.name} className="flex flex-wrap justify-between gap-2">
                  <span className="wrap-anywhere">{fee.name}</span>
                  <MoneyText amount={fee.amount} />
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-muted-foreground">
            Giá và phí này dùng khi lập hợp đồng mới. Hợp đồng hiện tại giữ nguyên mức giá đã chốt.
          </p>
        </section>
      </div>
      {room.images.length > 0 && (
        <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 md:p-6">
          <h2 className="text-lg font-semibold">Ảnh phòng</h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {room.images.map((image, index) => (
              <li key={image.path} className="relative">
                <img
                  src={image.url}
                  alt={`Ảnh phòng ${room.code}, ảnh ${index + 1}`}
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
        </section>
      )}
    </section>
  )
}
