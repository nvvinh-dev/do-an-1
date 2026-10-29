import { Archive, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import PageHeader from '@/components/PageHeader'
import RoomForm from '@/components/RoomForm'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAmenities } from '@/hooks/useAmenities'
import { useCreateRoom } from '@/hooks/useCreateRoom'
import { useProperty } from '@/hooks/useProperty'
import { useRoom } from '@/hooks/useRoom'
import { useUpdateRoom } from '@/hooks/useUpdateRoom'
import { isNotFoundError } from '@/lib/apiError'
import NotFoundPage from '@/pages/public/NotFoundPage'
import type { Amenity } from '@/types/amenityTypes'
import type { RoomDetail, RoomFormValues } from '@/types/roomTypes'
import { toRoomAreaInput } from '@/utils/validateRoomInput'

const EMPTY_VALUES: RoomFormValues = {
  code: '',
  area: '',
  maxOccupants: '',
  rentPrice: '',
  electricityUnitPrice: '',
  waterUnitPrice: '',
  description: '',
  serviceFees: [],
  amenityIds: [],
}

/** L3 — tạo/sửa thông tin phòng. Lưu xong mở chi tiết (frontend-screens mục 6, 8). */
export default function RoomFormPage() {
  const { id, propertyId } = useParams()
  // Key bảo đảm chuyển trực tiếp sang id khác không giữ dữ liệu form cũ.
  return id === undefined ? (
    <CreateRoomForm key={propertyId} propertyId={Number(propertyId)} />
  ) : (
    <EditRoomForm key={id} roomId={Number(id)} />
  )
}

function CreateRoomForm({ propertyId }: { propertyId: number }) {
  const propertyQuery = useProperty(propertyId)
  const mutation = useCreateRoom(propertyId)
  const navigate = useNavigate()
  if (isNotFoundError(propertyQuery.error) || isNotFoundError(mutation.error)) return <NotFoundPage />
  const property = propertyQuery.data
  const cancelTo = `/landlord/properties/${propertyId}`

  return (
    <section className="flex w-full max-w-2xl flex-col gap-6">
      <PageHeader title="Thêm phòng" description={property?.name} />
      {propertyQuery.isPending ? (
        <RoomFormSkeleton />
      ) : propertyQuery.isError ? (
        <ApiErrorAlert error={propertyQuery.error} onRetry={() => void propertyQuery.refetch()} />
      ) : property?.status === 'LuuTru' ? (
        <ArchivedNotice title="Khu trọ đã lưu trữ" detailPath={cancelTo} />
      ) : (
        property && (
          <AmenityGate>
            {(amenities) => (
              <RoomForm
                defaultValues={EMPTY_VALUES}
                imagePaths={[]}
                amenities={amenities}
                submitLabel="Thêm phòng"
                cancelTo={cancelTo}
                isPending={mutation.isPending}
                error={mutation.error}
                onSubmit={(request) =>
                  mutation.mutate(request, {
                    onSuccess: (room) => {
                      toast.success('Đã thêm phòng')
                      navigate(`/landlord/rooms/${room.id}`, { replace: true })
                    },
                  })
                }
              />
            )}
          </AmenityGate>
        )
      )}
    </section>
  )
}

function EditRoomForm({ roomId }: { roomId: number }) {
  const roomQuery = useRoom(roomId)
  const mutation = useUpdateRoom(roomId)
  const navigate = useNavigate()
  if (isNotFoundError(roomQuery.error) || isNotFoundError(mutation.error)) return <NotFoundPage />
  const room = roomQuery.data
  const cancelTo = `/landlord/rooms/${roomId}`

  return (
    <section className="flex w-full max-w-2xl flex-col gap-6">
      <PageHeader title="Sửa phòng" description={room && `${room.code} · ${room.propertyName}`} />
      {roomQuery.isPending ? (
        <RoomFormSkeleton />
      ) : roomQuery.isError ? (
        <ApiErrorAlert error={roomQuery.error} onRetry={() => void roomQuery.refetch()} />
      ) : room?.occupancyStatus === 'LuuTru' ? (
        <ArchivedNotice title="Phòng đã lưu trữ" detailPath={cancelTo} />
      ) : (
        room && (
          <>
            <Alert>
              <Info />
              <AlertDescription>
                Giá và phí mới chỉ áp dụng cho hợp đồng lập sau đó. Hợp đồng hiện tại và hóa đơn đã phát hành giữ
                nguyên.
              </AlertDescription>
            </Alert>
            <AmenityGate>
              {(amenities) => (
                <RoomForm
                  defaultValues={toFormValues(room)}
                  imagePaths={room.images.map((image) => image.path)}
                  amenities={amenities}
                  submitLabel="Lưu thay đổi"
                  cancelTo={cancelTo}
                  isPending={mutation.isPending}
                  error={mutation.error}
                  onSubmit={(request) =>
                    mutation.mutate(request, {
                      onSuccess: () => {
                        toast.success('Đã lưu thay đổi')
                        navigate(cancelTo, { replace: true })
                      },
                    })
                  }
                />
              )}
            </AmenityGate>
          </>
        )
      )}
    </section>
  )
}

function toFormValues(room: RoomDetail): RoomFormValues {
  return {
    code: room.code,
    area: toRoomAreaInput(String(room.area)),
    maxOccupants: String(room.maxOccupants),
    rentPrice: String(room.rentPrice),
    electricityUnitPrice: String(room.electricityUnitPrice),
    waterUnitPrice: String(room.waterUnitPrice),
    description: room.description ?? '',
    serviceFees: room.serviceFees.map((fee) => ({ name: fee.name, amount: String(fee.amount) })),
    amenityIds: room.amenities.map((amenity) => amenity.id),
  }
}

function AmenityGate({ children }: { children: (amenities: Amenity[]) => ReactNode }) {
  const query = useAmenities()
  if (query.isError) return <ApiErrorAlert error={query.error} onRetry={() => void query.refetch()} />
  if (query.isPending) return <RoomFormSkeleton />
  return children(query.data.filter((amenity) => amenity.scope === 'Phong'))
}

function ArchivedNotice({ title, detailPath }: { title: string; detailPath: string }) {
  return (
    <Alert>
      <Archive />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <p>Nội dung đã lưu trữ chỉ còn xem được, không thêm hoặc sửa phòng.</p>
        <Button asChild variant="outline">
          <Link to={detailPath}>Về trang chi tiết</Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}

function RoomFormSkeleton() {
  return (
    <div
      className="flex flex-col gap-5 rounded-xl border p-4 md:p-6"
      aria-busy="true"
      aria-label="Đang tải thông tin phòng"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  )
}
