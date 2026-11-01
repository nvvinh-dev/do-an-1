import { Archive, ChevronLeft, DoorOpen, Eye, EyeOff, Pencil, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import ConfirmDialog from '@/components/ConfirmDialog'
import MoneyText from '@/components/MoneyText'
import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useArchiveRoom } from '@/hooks/useArchiveRoom'
import { useChangeRoomOccupancyStatus } from '@/hooks/useChangeRoomOccupancyStatus'
import { useChangeRoomVisibility } from '@/hooks/useChangeRoomVisibility'
import { useRoom } from '@/hooks/useRoom'
import { isNotFoundError } from '@/lib/apiError'
import NotFoundPage from '@/pages/public/NotFoundPage'
import type { RoomDetail, RoomOccupancyStatus } from '@/types/roomTypes'
import { getRoomListingNote } from '@/utils/getRoomListingNote'

/**
 * L3 — thông tin phòng ở góc nhìn quản lý (API mục 5.2): bật/tắt hiển thị, chuyển Trống ↔ Bảo trì,
 * lưu trữ. Đổi trạng thái xong thì ở lại trang, hiện `toast` và tải lại dữ liệu (mục 8).
 */
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
  if (query.isLoadingError) return <ApiErrorAlert error={query.error} onRetry={() => void query.refetch()} />
  return (
    <RoomDetailContent
      room={query.data}
      refetchError={query.isRefetchError ? query.error : null}
      onRetry={() => void query.refetch()}
    />
  )
}

type RoomAction = 'visibility' | 'occupancy' | 'archive'

interface RoomDetailContentProps {
  room: RoomDetail
  /** Lỗi của lần tải lại gần nhất; `null` khi lần tải lại không lỗi. */
  refetchError: unknown
  onRetry: () => void
}

function RoomDetailContent({ room, refetchError, onRetry }: RoomDetailContentProps) {
  const isArchived = room.occupancyStatus === 'LuuTru'
  // Thao tác bấm gần nhất; chỉ thao tác này hiện lỗi. Gặp `409` thì phòng tải lại và nút vừa bấm có
  // thể biến mất (phòng đã sang Đang giữ chỗ hay Lưu trữ), nên lỗi không ẩn theo nút; còn lỗi cũ của
  // nút khác thì không nằm lại sau một thao tác mới.
  const [lastAction, setLastAction] = useState<RoomAction | null>(null)
  return (
    <section className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link to={`/landlord/properties/${room.propertyId}`}>
          <ChevronLeft />
          Về khu trọ
        </Link>
      </Button>
      {/* Lần tải lại lỗi (quay lại tab, tải lại sau `409`) thì giữ nội dung cũ và hộp thoại đang mở, chỉ báo lỗi kèm nút thử lại. */}
      <ApiErrorAlert error={refetchError} onRetry={onRetry} />
      <PageHeader
        title={`Phòng ${room.code}`}
        description={room.propertyName}
        action={!isArchived && <RoomActions room={room} onAction={() => setLastAction('archive')} />}
      />
      {isArchived && (
        <Alert>
          <Archive />
          <AlertTitle>Phòng đã lưu trữ</AlertTitle>
          <AlertDescription>Phòng chỉ còn xem được, không sửa thông tin.</AlertDescription>
        </Alert>
      )}
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm md:p-6">
        <h2 className="text-lg font-semibold">Đăng tin và khai thác</h2>
        <VisibilityControl
          room={room}
          showError={lastAction === 'visibility'}
          onAction={() => setLastAction('visibility')}
        />
        <Separator />
        <OccupancyControl
          room={room}
          showError={lastAction === 'occupancy'}
          onAction={() => setLastAction('occupancy')}
        />
      </section>
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

// Chủ trọ chỉ lưu trữ và tự chuyển trạng thái khai thác với phòng Trống hoặc Bảo trì (FR-20, FR-89).
function isLandlordManaged(status: RoomOccupancyStatus) {
  return status === 'Trong' || status === 'BaoTri'
}

function RoomActions({ room, onAction }: { room: RoomDetail; onAction: () => void }) {
  const archiveMutation = useArchiveRoom(room.id)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3 md:flex-row">
      <Button asChild variant="outline" size="page">
        <Link to={`/landlord/rooms/${room.id}/edit`}>
          <Pencil />
          Sửa phòng
        </Link>
      </Button>
      {isLandlordManaged(room.occupancyStatus) && (
        <Button type="button" variant="destructive" size="page" onClick={() => setConfirmOpen(true)}>
          <Archive />
          Lưu trữ
        </Button>
      )}
      {/* Hộp thoại nằm ngoài điều kiện của nút: gặp `409` phòng tải lại sang Đang giữ chỗ thì nút ẩn,
          còn hộp thoại vẫn mở và hiện `detail`. */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Lưu trữ phòng"
        description={`Phòng ${room.code} sẽ ngừng cho thuê và các yêu cầu thuê đang chờ duyệt của phòng bị từ chối. Phòng đã lưu trữ chỉ còn xem được, không bỏ lưu trữ được.`}
        confirmLabel="Lưu trữ"
        destructive
        isPending={archiveMutation.isPending}
        error={archiveMutation.error}
        onConfirm={() => {
          onAction()
          archiveMutation.mutate(undefined, {
            onSuccess: () => {
              setConfirmOpen(false)
              toast.success('Đã lưu trữ phòng')
            },
          })
        }}
      />
    </div>
  )
}

interface RoomControlProps {
  room: RoomDetail
  /** Chỉ thao tác bấm gần nhất hiện lỗi (xem `RoomDetailContent`). */
  showError: boolean
  onAction: () => void
}

/** Bật hiển thị khi phòng chưa có ảnh nào thì server trả `422`; lỗi hiện ngay dưới nút. */
function VisibilityControl({ room, showError, onAction }: RoomControlProps) {
  const mutation = useChangeRoomVisibility(room.id)
  const canToggle = room.occupancyStatus !== 'LuuTru' && room.visibilityStatus !== 'DaAnBoiAdmin'
  const isShown = room.visibilityStatus === 'DangHienThi'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">Hiển thị tin</h3>
            <StatusBadge kind="roomVisibility" status={room.visibilityStatus} />
          </div>
          <p className="text-sm text-muted-foreground">{getRoomListingNote(room)}</p>
        </div>
        {canToggle && (
          <Button
            type="button"
            variant={isShown ? 'outline' : 'default'}
            size="page"
            disabled={mutation.isPending}
            onClick={() => {
              onAction()
              mutation.mutate(isShown ? 'DaAnBoiChuTro' : 'DangHienThi', {
                onSuccess: () => toast.success(isShown ? 'Đã ẩn tin' : 'Đã bật hiển thị'),
              })
            }}
          >
            {mutation.isPending ? <Spinner /> : isShown ? <EyeOff /> : <Eye />}
            {isShown ? 'Ẩn tin' : 'Bật hiển thị'}
          </Button>
        )}
      </div>
      {showError && <ApiErrorAlert error={mutation.error} />}
    </div>
  )
}

const OCCUPANCY_NOTES: Record<RoomOccupancyStatus, string> = {
  Trong: 'Chuyển sang Bảo trì khi phòng cần sửa chữa; phòng tạm rời khỏi tìm kiếm cho tới khi về Trống.',
  BaoTri: 'Chuyển về Trống khi phòng đã sẵn sàng cho thuê lại.',
  DangGiuCho: 'Hệ thống tự chuyển trạng thái này theo yêu cầu thuê, hợp đồng và thanh lý.',
  DangThue: 'Hệ thống tự chuyển trạng thái này theo yêu cầu thuê, hợp đồng và thanh lý.',
  LuuTru: 'Phòng đã lưu trữ, không đổi được trạng thái khai thác.',
}

/** Về Trống khi hợp đồng hiện tại chưa thanh lý hoặc chưa hủy thì server trả `409` (BR-08); lỗi hiện ngay dưới nút. */
function OccupancyControl({ room, showError, onAction }: RoomControlProps) {
  const mutation = useChangeRoomOccupancyStatus(room.id)
  const toMaintenance = room.occupancyStatus === 'Trong'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">Trạng thái khai thác</h3>
            <StatusBadge kind="roomOccupancy" status={room.occupancyStatus} />
          </div>
          <p className="text-sm text-muted-foreground">{OCCUPANCY_NOTES[room.occupancyStatus]}</p>
        </div>
        {isLandlordManaged(room.occupancyStatus) && (
          <Button
            type="button"
            variant="outline"
            size="page"
            disabled={mutation.isPending}
            onClick={() => {
              onAction()
              mutation.mutate(toMaintenance ? 'BaoTri' : 'Trong', {
                onSuccess: () =>
                  toast.success(toMaintenance ? 'Đã chuyển phòng sang Bảo trì' : 'Đã chuyển phòng về Trống'),
              })
            }}
          >
            {mutation.isPending ? <Spinner /> : toMaintenance ? <Wrench /> : <DoorOpen />}
            {toMaintenance ? 'Chuyển sang Bảo trì' : 'Chuyển về Trống'}
          </Button>
        )}
      </div>
      {showError && <ApiErrorAlert error={mutation.error} />}
    </div>
  )
}
