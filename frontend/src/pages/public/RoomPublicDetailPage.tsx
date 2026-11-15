import { ChevronLeft, ImageOff, LogIn, Send } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import MoneyText from '@/components/MoneyText'
import PageHeader from '@/components/PageHeader'
import RentalRequestForm from '@/components/RentalRequestForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { usePublicRoom } from '@/hooks/usePublicRoom'
import { isNotFoundError } from '@/lib/apiError'
import { cn } from '@/lib/utils'
import NotFoundPage from '@/pages/public/NotFoundPage'
import type { PublicRoom, PublicRoomDetail } from '@/types/roomSearchTypes'

/** `state` mà thẻ phòng ở P1 gửi kèm: query bộ lọc và trang đang xem, để nút quay lại giữ nguyên kết quả. */
interface RoomPublicDetailLocationState {
  listSearch?: string
}

/**
 * P2 — Chi tiết phòng (docs/frontend-screens.md mục 2): ảnh theo thứ tự, giá, đơn giá điện nước, phí
 * dịch vụ, tiện ích của phòng và khu trọ. Người thuê có nút **Gửi yêu cầu thuê** mở `RentalRequestForm`;
 * khách có **Đăng nhập để gửi yêu cầu**; Chủ trọ và Admin không có nút. Phòng không đủ điều kiện
 * BR-05 (ẩn, không còn trống, của Chủ trọ bị khóa) trả `404` → `NotFoundPage`.
 */
export default function RoomPublicDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  // Mở thẳng từ đường dẫn chia sẻ thì không có `state`: quay về trang tìm phòng không lọc.
  const listSearch = (location.state as RoomPublicDetailLocationState | null)?.listSearch ?? ''
  // Id không phải số thì server trả 404 như phòng không tồn tại.
  const roomQuery = usePublicRoom(Number(id))

  if (isNotFoundError(roomQuery.error)) {
    return <NotFoundPage />
  }

  return (
    <section className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link to={{ pathname: '/', search: listSearch }}>
          <ChevronLeft />
          Về kết quả tìm kiếm
        </Link>
      </Button>

      {roomQuery.isPending ? (
        <RoomDetailSkeleton />
      ) : roomQuery.isLoadingError ? (
        <ApiErrorAlert error={roomQuery.error} onRetry={() => void roomQuery.refetch()} />
      ) : (
        <>
          {/* Lần tải lại lỗi (quay lại tab) thì giữ nội dung cũ và form đang nhập, chỉ báo lỗi kèm nút thử lại. */}
          {roomQuery.isRefetchError && (
            <ApiErrorAlert error={roomQuery.error} onRetry={() => void roomQuery.refetch()} />
          )}
          <RoomDetailContent detail={roomQuery.data} />
        </>
      )}
    </section>
  )
}

function RoomDetailContent({ detail }: { detail: PublicRoomDetail }) {
  const { room, property } = detail

  return (
    <>
      <PageHeader
        title={`Phòng ${room.code} · ${property.name}`}
        description={`${property.address}, ${property.ward}, ${property.city}`}
      />

      {/* Dưới `lg` xếp một cột: ảnh → giá và nút gửi yêu cầu → thông tin. Từ `lg` khối giá là cột phải,
          bám theo khi cuộn. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <RoomGallery images={room.images} roomCode={room.code} />

        {/* Từ `lg` khối bám theo khi cuộn nên không được cao hơn phần màn hình dưới thanh trên: mở form gửi
            yêu cầu thì khối tự cuộn bên trong, nút gửi vẫn tới được trên màn laptop. */}
        <aside className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm md:p-6 lg:sticky lg:top-22 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100svh-6.5rem)] lg:overflow-y-auto">
          <PriceSummary room={room} />
          <RentalRequestAction room={room} />
        </aside>

        <div className="flex min-w-0 flex-col gap-6 lg:col-start-1">
          <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm md:p-6">
            <h2 className="text-lg font-semibold">Thông tin phòng</h2>
            <dl className="grid gap-3 md:grid-cols-[10rem_1fr]">
              <dt className="text-muted-foreground">Diện tích</dt>
              <dd className="tabular-nums">{room.area.toLocaleString('vi-VN')} m²</dd>
              <dt className="text-muted-foreground">Số người tối đa</dt>
              <dd>{room.maxOccupants} người</dd>
              <dt className="text-muted-foreground">Mô tả</dt>
              <dd className="whitespace-pre-line wrap-anywhere">{room.description || 'Chủ trọ chưa ghi mô tả.'}</dd>
              <dt className="text-muted-foreground">Tiện ích phòng</dt>
              <dd>
                <AmenityList amenities={room.amenities} emptyText="Phòng chưa có tiện ích riêng." />
              </dd>
            </dl>
          </section>

          <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm md:p-6">
            <h2 className="text-lg font-semibold">Khu trọ {property.name}</h2>
            <dl className="grid gap-3 md:grid-cols-[10rem_1fr]">
              <dt className="text-muted-foreground">Địa chỉ</dt>
              <dd className="wrap-anywhere">
                {property.address}, {property.ward}, {property.city}
              </dd>
              <dt className="text-muted-foreground">Mô tả</dt>
              <dd className="whitespace-pre-line wrap-anywhere">
                {property.description || 'Chủ trọ chưa ghi mô tả.'}
              </dd>
              <dt className="text-muted-foreground">Tiện ích khu trọ</dt>
              <dd>
                <AmenityList amenities={property.amenities} emptyText="Khu trọ chưa có tiện ích chung." />
              </dd>
            </dl>
            {property.images.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {property.images.map((url, index) => (
                  <li key={url}>
                    <img
                      src={url}
                      alt={`Ảnh khu trọ ${property.name}, ảnh ${index + 1}`}
                      loading="lazy"
                      className="aspect-4/3 w-full rounded-lg bg-muted object-cover"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  )
}

/** Ảnh lớn là ảnh đang chọn, mặc định ảnh đầu (ảnh đại diện); bấm ảnh nhỏ để đổi. */
function RoomGallery({ images, roomCode }: { images: string[]; roomCode: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  // Lần tải lại trả ít ảnh hơn thì quay về ảnh đầu.
  const shownIndex = selectedIndex < images.length ? selectedIndex : 0

  if (images.length === 0) {
    return (
      <div className="flex aspect-4/3 w-full items-center justify-center rounded-xl bg-muted text-muted-foreground lg:col-start-1">
        <ImageOff aria-hidden className="size-10" />
        <span className="sr-only">Phòng {roomCode} chưa có ảnh</span>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 lg:col-start-1">
      <img
        src={images[shownIndex]}
        alt={`Ảnh phòng ${roomCode}, ảnh ${shownIndex + 1}`}
        className="aspect-4/3 w-full rounded-xl bg-muted object-cover"
      />
      {images.length > 1 && (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {images.map((url, index) => (
            <li key={url}>
              <button
                type="button"
                aria-label={`Xem ảnh ${index + 1} của phòng ${roomCode}`}
                aria-pressed={index === shownIndex}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  'block w-full overflow-hidden rounded-lg border-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  index === shownIndex ? 'border-primary' : 'border-transparent opacity-80 hover:opacity-100',
                )}
              >
                <img src={url} alt="" loading="lazy" className="aspect-4/3 w-full bg-muted object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Mọi số tiền là số server trả; frontend không tự tính (docs/frontend-screens.md mục 1). */
function PriceSummary({ room }: { room: PublicRoom }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-2xl font-semibold text-primary">
        <MoneyText amount={room.rentPrice} /> <span className="text-sm font-normal text-muted-foreground">/ tháng</span>
      </p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Điện / kWh</dt>
        <dd className="text-right">
          <MoneyText amount={room.electricityUnitPrice} />
        </dd>
        <dt className="text-muted-foreground">Nước / m³</dt>
        <dd className="text-right">
          <MoneyText amount={room.waterUnitPrice} />
        </dd>
      </dl>
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Phí dịch vụ mỗi tháng</h2>
        {room.serviceFees.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có phí dịch vụ cố định.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {room.serviceFees.map((fee) => (
              <li key={fee.name} className="flex justify-between gap-4">
                <span className="min-w-0 text-muted-foreground wrap-anywhere">{fee.name}</span>
                <MoneyText amount={fee.amount} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/**
 * Nút theo vai trò (docs/frontend-screens.md mục 2). Người thuê bấm **Gửi yêu cầu thuê** thì form hiện
 * ngay dưới; form tự hiện `toast` và mở chi tiết yêu cầu vừa gửi ở T3. Khách được đưa tới A1 kèm
 * `redirect` để đăng nhập xong quay lại đúng phòng này. Chủ trọ, Admin không có nút.
 */
function RentalRequestAction({ room }: { room: PublicRoom }) {
  const location = useLocation()
  const { data: user, isPending } = useCurrentUser()
  const [formOpen, setFormOpen] = useState(false)

  if (isPending) {
    return (
      <ActionSection>
        <Skeleton className="h-10 w-full" />
      </ActionSection>
    )
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname)
    return (
      <ActionSection>
        <Button asChild size="lg" className="w-full">
          <Link to={`/login?redirect=${redirect}`}>
            <LogIn />
            Đăng nhập để gửi yêu cầu
          </Link>
        </Button>
      </ActionSection>
    )
  }

  if (!user.roles.includes('Tenant')) {
    return null
  }

  if (!formOpen) {
    return (
      <ActionSection>
        <Button type="button" size="lg" className="w-full" onClick={() => setFormOpen(true)}>
          <Send />
          Gửi yêu cầu thuê
        </Button>
      </ActionSection>
    )
  }

  return (
    <ActionSection>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Gửi yêu cầu thuê</h2>
        <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
          Đóng
        </Button>
      </div>
      <RentalRequestForm roomId={room.id} maxOccupants={room.maxOccupants} />
    </ActionSection>
  )
}

/** Đường kẻ ngăn với khối giá chỉ hiện khi có nút hoặc form; Chủ trọ, Admin không có nên không có đường kẻ thừa. */
function ActionSection({ children }: { children: ReactNode }) {
  return (
    <>
      <Separator />
      <div className="flex flex-col gap-4">{children}</div>
    </>
  )
}

function AmenityList({ amenities, emptyText }: { amenities: string[]; emptyText: string }) {
  if (amenities.length === 0) {
    return <span className="text-muted-foreground">{emptyText}</span>
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {amenities.map((amenity) => (
        <li key={amenity}>
          <Badge variant="secondary">{amenity}</Badge>
        </li>
      ))}
    </ul>
  )
}

function RoomDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Đang tải phòng">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="aspect-4/3 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  )
}
