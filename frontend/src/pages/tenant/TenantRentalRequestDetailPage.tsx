import { ChevronLeft, CircleX, FileText, Phone, TimerOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import ConfirmDialog from '@/components/ConfirmDialog'
import CountdownText from '@/components/CountdownText'
import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCancelRentalRequest } from '@/hooks/useCancelRentalRequest'
import { useRentalRequest } from '@/hooks/useRentalRequest'
import { isNotFoundError } from '@/lib/apiError'
import NotFoundPage from '@/pages/public/NotFoundPage'
import type { RentalRequestDetail } from '@/types/rentalRequestTypes'
import { formatDate } from '@/utils/formatDate'
import { isRentalRequestOverdue } from '@/utils/isRentalRequestOverdue'

/**
 * T3 — Chi tiết yêu cầu thuê (docs/frontend-screens.md mục 5). Hiện theo trạng thái: chờ duyệt →
 * đếm ngược hạn duyệt, nút rút; đã duyệt → số điện thoại Chủ trọ, đếm ngược hạn giữ chỗ, nút rút;
 * đã lập hợp đồng → liên kết tới hợp đồng; từ chối, đã hủy, hết hạn → chỉ xem. Chờ duyệt hay đã
 * duyệt mà đã quá hạn (tác vụ định kỳ chưa kịp chuyển sang hết hạn) → chỉ xem, báo yêu cầu sắp tự
 * hết hạn. Rút xong thì ở lại trang, hiện `toast` và tải lại dữ liệu (mục 8).
 */
export default function TenantRentalRequestDetailPage() {
  const { id } = useParams()
  // Id không phải số thì server trả 404 như yêu cầu không thuộc mình.
  const rentalRequestId = Number(id)
  const rentalRequestQuery = useRentalRequest(rentalRequestId)

  if (isNotFoundError(rentalRequestQuery.error)) {
    return <NotFoundPage />
  }

  return (
    <section className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link to="/tenant/rental-requests">
          <ChevronLeft />
          Yêu cầu thuê
        </Link>
      </Button>

      {rentalRequestQuery.isPending ? (
        <RentalRequestDetailSkeleton />
      ) : rentalRequestQuery.isLoadingError ? (
        <ApiErrorAlert error={rentalRequestQuery.error} onRetry={() => void rentalRequestQuery.refetch()} />
      ) : (
        <>
          {/* Lần tải lại lỗi (quay lại tab, tải lại sau `409`) thì giữ nội dung cũ và hộp thoại đang mở, chỉ báo lỗi kèm nút thử lại. */}
          {rentalRequestQuery.isRefetchError && (
            <ApiErrorAlert error={rentalRequestQuery.error} onRetry={() => void rentalRequestQuery.refetch()} />
          )}
          <RentalRequestDetailContent rentalRequest={rentalRequestQuery.data} />
        </>
      )}
    </section>
  )
}

function RentalRequestDetailContent({ rentalRequest }: { rentalRequest: RentalRequestDetail }) {
  const [cancelOpen, setCancelOpen] = useState(false)
  // Hạn đang chạy: `expiresAt` khi chờ duyệt, `holdExpiresAt` khi đã duyệt; trạng thái khác không có.
  const deadline = rentalRequest.expiresAt ?? rentalRequest.holdExpiresAt
  // Chỉ dùng để so với hạn. Trang đang mở qua mốc hạn thì vẽ lại đúng lúc đó để ẩn nút rút và đổi
  // khối thông báo, không chờ tải lại dữ liệu.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!deadline) {
      return
    }
    const msUntilOverdue = new Date(deadline).getTime() - Date.now()
    if (msUntilOverdue < 0) {
      return
    }
    // Thêm 1 ms vì đúng mốc hạn thì chưa tính là quá hạn (`isRentalRequestOverdue`).
    const timer = setTimeout(() => setNow(new Date()), msUntilOverdue + 1)
    return () => clearTimeout(timer)
  }, [deadline])
  // Quá hạn mà tác vụ định kỳ chưa chạy thì server vẫn trả `ChoDuyet`/`DaDuyet` nhưng `/cancel` đã trả `409`.
  const isOverdue = isRentalRequestOverdue(rentalRequest, now)
  const canCancel = (rentalRequest.status === 'ChoDuyet' || rentalRequest.status === 'DaDuyet') && !isOverdue

  return (
    <>
      <PageHeader
        title={`Yêu cầu thuê phòng ${rentalRequest.room.code}`}
        description={rentalRequest.room.propertyName}
        action={
          canCancel && (
            <Button type="button" variant="destructive" size="page" onClick={() => setCancelOpen(true)}>
              <CircleX />
              Rút yêu cầu
            </Button>
          )
        }
      />

      <CancelRentalRequestDialog rentalRequest={rentalRequest} open={cancelOpen} onOpenChange={setCancelOpen} />

      <RentalRequestStatusNotice rentalRequest={rentalRequest} isOverdue={isOverdue} />

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6">
        <h2 className="text-lg font-medium">Thông tin yêu cầu</h2>
        <dl className="grid gap-4 text-sm md:grid-cols-[12rem_1fr]">
          <dt className="text-muted-foreground">Trạng thái</dt>
          <dd>
            <StatusBadge kind="rentalRequest" status={rentalRequest.status} />
          </dd>

          <dt className="text-muted-foreground">Phòng</dt>
          <dd className="wrap-anywhere">
            Phòng {rentalRequest.room.code} · {rentalRequest.room.propertyName}
          </dd>

          <dt className="text-muted-foreground">Ngày dự kiến vào ở</dt>
          <dd>{formatDate(rentalRequest.expectedMoveInDate)}</dd>

          <dt className="text-muted-foreground">Số người ở</dt>
          <dd className="tabular-nums">{rentalRequest.expectedOccupants} người</dd>

          <dt className="text-muted-foreground">Ghi chú</dt>
          <dd className="whitespace-pre-line wrap-anywhere">
            {rentalRequest.note ?? <span className="text-muted-foreground">Không có ghi chú</span>}
          </dd>

          <dt className="text-muted-foreground">Ngày gửi</dt>
          <dd>{formatDate(rentalRequest.submittedAt)}</dd>

          {rentalRequest.processedAt && (
            <>
              <dt className="text-muted-foreground">Ngày xử lý</dt>
              <dd>{formatDate(rentalRequest.processedAt)}</dd>
            </>
          )}
        </dl>
      </div>
    </>
  )
}

interface RentalRequestStatusNoticeProps {
  rentalRequest: RentalRequestDetail
  /** Đã qua `expiresAt` hoặc `holdExpiresAt` (`isRentalRequestOverdue`). */
  isOverdue: boolean
}

/** Khối đầu trang nói rõ yêu cầu đang ở đâu và người thuê cần làm gì tiếp, theo bảng T3. */
function RentalRequestStatusNotice({ rentalRequest, isOverdue }: RentalRequestStatusNoticeProps) {
  // Chỉ `ChoDuyet` và `DaDuyet` có hạn, nên chỉ hai trạng thái này quá hạn được.
  if (isOverdue) {
    return <OverdueNotice rentalRequest={rentalRequest} />
  }

  switch (rentalRequest.status) {
    case 'ChoDuyet':
      return (
        <Alert>
          <AlertTitle>Đang chờ Chủ trọ duyệt</AlertTitle>
          <AlertDescription>
            {rentalRequest.expiresAt && (
              <p>
                Hạn duyệt: <CountdownText expiresAt={rentalRequest.expiresAt} className="font-medium" />.
              </p>
            )}
            <p>Quá hạn mà Chủ trọ chưa xử lý thì yêu cầu tự hết hạn.</p>
          </AlertDescription>
        </Alert>
      )

    case 'DaDuyet':
      return (
        <Alert className="border-success/40">
          <AlertTitle>Chủ trọ đã duyệt và đang giữ phòng cho bạn</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            {rentalRequest.holdExpiresAt && (
              <p>
                Giữ chỗ: <CountdownText expiresAt={rentalRequest.holdExpiresAt} className="font-medium" />. Hết hạn
                giữ chỗ mà chưa lập hợp đồng thì yêu cầu hết hạn và phòng được mở lại cho người khác.
              </p>
            )}
            {rentalRequest.otherPartyPhoneNumber && (
              <>
                <p>Liên hệ Chủ trọ để thống nhất hợp đồng:</p>
                <Button asChild variant="outline">
                  <a href={`tel:${rentalRequest.otherPartyPhoneNumber}`}>
                    <Phone />
                    {rentalRequest.otherPartyPhoneNumber}
                  </a>
                </Button>
              </>
            )}
          </AlertDescription>
        </Alert>
      )

    case 'DaLapHopDong':
      return (
        <Alert>
          <FileText />
          <AlertTitle>Chủ trọ đã lập hợp đồng từ yêu cầu này</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <p>Xem hợp đồng để theo dõi các bước tiếp theo.</p>
            {rentalRequest.contractId !== null && (
              <Button asChild variant="outline">
                <Link to={`/tenant/contracts/${rentalRequest.contractId}`}>Xem hợp đồng</Link>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )

    case 'TuChoi':
      return (
        <Alert>
          <CircleX />
          <AlertTitle>Yêu cầu bị từ chối</AlertTitle>
          {rentalRequest.rejectReason && (
            <AlertDescription className="whitespace-pre-line wrap-anywhere">
              Lý do: {rentalRequest.rejectReason}
            </AlertDescription>
          )}
        </Alert>
      )

    // `DaHuy`, `HetHan`: chỉ xem, trạng thái đã hiện ở bảng thông tin.
    default:
      return null
  }
}

/**
 * Yêu cầu chờ duyệt hay đã duyệt đã quá hạn mà tác vụ định kỳ chưa kịp chuyển sang hết hạn. Thay
 * đếm ngược, câu giữ phòng và số điện thoại Chủ trọ: server đã chặn rút, phòng không còn được giữ.
 */
function OverdueNotice({ rentalRequest }: { rentalRequest: RentalRequestDetail }) {
  return (
    <Alert variant="destructive">
      <TimerOff />
      {rentalRequest.status === 'DaDuyet' ? (
        <>
          <AlertTitle>Đã quá hạn giữ chỗ 72 giờ</AlertTitle>
          <AlertDescription>
            <p>Chưa lập hợp đồng trong hạn nên yêu cầu sẽ tự hết hạn và phòng mở lại cho người khác.</p>
          </AlertDescription>
        </>
      ) : (
        <>
          <AlertTitle>Đã quá hạn duyệt 168 giờ</AlertTitle>
          <AlertDescription>
            <p>Chủ trọ chưa xử lý trong hạn nên yêu cầu sẽ tự hết hạn.</p>
          </AlertDescription>
        </>
      )}
    </Alert>
  )
}

interface CancelRentalRequestDialogProps {
  rentalRequest: RentalRequestDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Chủ trọ vừa từ chối, lập hợp đồng, hoặc yêu cầu đã quá hạn thì server trả `409` và dữ liệu được
 * tải lại sang trạng thái mới. Hộp thoại nằm ngoài nút **Rút yêu cầu** để không bị gỡ theo nút khi
 * trạng thái mới không còn rút được: vẫn mở và hiện `detail` cho người dùng biết vì sao.
 */
function CancelRentalRequestDialog({ rentalRequest, open, onOpenChange }: CancelRentalRequestDialogProps) {
  const cancelMutation = useCancelRentalRequest(rentalRequest.id)
  const isHolding = rentalRequest.status === 'DaDuyet'

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Rút yêu cầu thuê"
      description={
        isHolding
          ? `Phòng ${rentalRequest.room.code} đang được giữ cho bạn sẽ mở lại cho người khác thuê, Chủ trọ nhận thông báo. Yêu cầu đã rút không khôi phục được.`
          : `Chủ trọ sẽ không duyệt được yêu cầu này nữa. Yêu cầu đã rút không khôi phục được; muốn thuê phòng ${rentalRequest.room.code} thì gửi yêu cầu mới.`
      }
      confirmLabel="Rút yêu cầu"
      destructive
      isPending={cancelMutation.isPending}
      error={cancelMutation.error}
      onConfirm={() =>
        cancelMutation.mutate(undefined, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã rút yêu cầu thuê')
          },
        })
      }
    />
  )
}

function RentalRequestDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-48 max-w-full" />
      </div>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
