import { DoorOpen, Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import MoneyText from '@/components/MoneyText'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useRoomList } from '@/hooks/useRoomList'
import type { RoomListItem } from '@/types/roomTypes'

/**
 * Danh sách phòng trên trang chi tiết khu trọ (L2, API mục 5.2). Mặc định ẩn phòng đã lưu trữ;
 * lựa chọn xem cả nằm trên URL để quay lại trang vẫn giữ.
 */
export default function PropertyRoomList({ propertyId, isArchived }: { propertyId: number; isArchived: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const includeArchived = searchParams.get('includeArchived') === 'true'
  const query = useRoomList(propertyId, includeArchived)

  return (
    <section className="flex flex-col gap-4" aria-labelledby="rooms-heading">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 id="rooms-heading" className="text-lg font-semibold">
          Danh sách phòng
        </h2>
        {!isArchived && (
          <Button asChild size="page">
            <Link to={`/landlord/properties/${propertyId}/rooms/new`}>
              <Plus />
              Thêm phòng
            </Link>
          </Button>
        )}
      </div>
      <Field orientation="horizontal">
        <Checkbox
          id="include-archived-rooms"
          checked={includeArchived}
          onCheckedChange={(checked) => {
            const next = new URLSearchParams(searchParams)
            if (checked === true) next.set('includeArchived', 'true')
            else next.delete('includeArchived')
            setSearchParams(next, { replace: true })
          }}
        />
        <FieldLabel htmlFor="include-archived-rooms" className="font-normal">
          Hiện cả phòng đã lưu trữ
        </FieldLabel>
      </Field>
      {query.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải danh sách phòng">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ApiErrorAlert error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>{includeArchived ? 'Chưa có phòng nào' : 'Chưa có phòng đang khai thác'}</EmptyTitle>
            <EmptyDescription>
              {!isArchived
                ? 'Chọn Thêm phòng để khai báo phòng cho khu trọ.'
                : includeArchived
                  ? 'Khu trọ đã lưu trữ, không thêm được phòng mới.'
                  : 'Bật “Hiện cả phòng đã lưu trữ” để xem các phòng của khu.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <RoomList rooms={query.data} />
      )}
    </section>
  )
}

function RoomList({ rooms }: { rooms: RoomListItem[] }) {
  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {rooms.map((room) => (
          <li key={room.id}>
            <Link
              to={`/landlord/rooms/${room.id}`}
              className="flex gap-3 rounded-xl border bg-card p-4 shadow-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RoomCover room={room} />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="font-medium wrap-anywhere">{room.code}</span>
                <MoneyText amount={room.rentPrice} />
                <span className="text-sm text-muted-foreground">
                  {room.area.toLocaleString('vi-VN')} m² · {room.maxOccupants} người
                </span>
                <RoomStatuses room={room} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <div className="hidden rounded-xl border bg-card shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4">Phòng</TableHead>
              <TableHead>Giá thuê / tháng</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((room) => (
              <TableRow key={room.id}>
                <TableCell className="px-4 py-3 whitespace-normal">
                  <div className="flex items-center gap-3">
                    <RoomCover room={room} />
                    <div className="flex min-w-0 flex-col gap-1">
                      <Link
                        to={`/landlord/rooms/${room.id}`}
                        className="font-medium wrap-anywhere underline-offset-4 hover:underline"
                      >
                        {room.code}
                      </Link>
                      <span className="text-sm text-muted-foreground">
                        {room.area.toLocaleString('vi-VN')} m² · {room.maxOccupants} người
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <MoneyText amount={room.rentPrice} />
                </TableCell>
                <TableCell className="py-3 whitespace-normal">
                  <RoomStatuses room={room} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

function RoomStatuses({ room }: { room: RoomListItem }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <StatusBadge kind="roomOccupancy" status={room.occupancyStatus} />
        <StatusBadge kind="roomVisibility" status={room.visibilityStatus} />
      </div>
      <span className="text-sm text-muted-foreground">
        {room.isListed ? 'Có trong tìm kiếm' : 'Không xuất hiện trong tìm kiếm'}
      </span>
    </div>
  )
}

function RoomCover({ room }: { room: RoomListItem }) {
  return room.coverImageUrl ? (
    <img
      src={room.coverImageUrl}
      alt={`Ảnh đại diện phòng ${room.code}`}
      className="size-14 shrink-0 rounded-lg object-cover"
      loading="lazy"
    />
  ) : (
    <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
      <DoorOpen className="size-5" aria-hidden="true" />
    </div>
  )
}
