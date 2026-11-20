import { CircleCheck, CircleX, FilePlus, FileText, Phone, TimerOff, Undo2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { toast } from 'sonner'
import ActionPanel from '@/components/ActionPanel'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import BackLink from '@/components/BackLink'
import ConfirmDialog from '@/components/ConfirmDialog'
import CountdownText from '@/components/CountdownText'
import DetailHeader from '@/components/DetailHeader'
import DetailCard from '@/components/DetailCard'
import DetailLayout from '@/components/DetailLayout'
import { Fact } from '@/components/FactList'
import StatusBadge from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLeaseMutation } from '@/hooks/useLeaseMutation'
import { useRentalRequest } from '@/hooks/useRentalRequest'
import { isNotFoundError } from '@/lib/apiError'
import NotFoundPage from '@/pages/public/NotFoundPage'
import { approveRentalRequest, rejectRentalRequest } from '@/services/rentalRequestService'
import type { RentalRequestDetail } from '@/types/rentalRequestTypes'
import { formatDate } from '@/utils/formatDate'
import { isRentalRequestOverdue } from '@/utils/isRentalRequestOverdue'

/** `state` mà liên kết ở trang danh sách gửi kèm: query lọc và trang đang xem, để nút quay lại giữ nguyên. */
interface RentalRequestDetailLocationState {
  listSearch?: string
}

/**
 * L5 — Chi tiết yêu cầu thuê ở góc nhìn Chủ trọ (docs/frontend-screens.md mục 6). Chờ duyệt → đếm
 * ngược hạn duyệt, nút duyệt và từ chối; đã duyệt → số điện thoại người thuê, đếm ngược hạn giữ chỗ,
 * nút lập hợp đồng (→ L6) và hủy duyệt; đã lập hợp đồng → liên kết tới hợp đồng; từ chối, đã hủy, hết
 * hạn → chỉ xem. Quá hạn mà tác vụ định kỳ chưa kịp chuyển sang hết hạn → chỉ xem, vì server đã trả
 * `409` cho mọi thao tác. Thao tác xong thì ở lại trang, hiện `toast` và tải lại dữ liệu (mục 8).
 */
export default function LandlordRentalRequestDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  // Mở thẳng từ thông báo hay L1 thì không có `state`: quay về danh sách không lọc.
  const listSearch = (location.state as RentalRequestDetailLocationState | null)?.listSearch ?? ''
  // Id không phải số thì server trả 404 như yêu cầu không thuộc phòng của mình.
  const rentalRequestQuery = useRentalRequest(Number(id))

  if (isNotFoundError(rentalRequestQuery.error)) {
    return <NotFoundPage />
  }

  return (
    <section className="flex flex-col gap-6">
      <BackLink to={{ pathname: '/landlord/rental-requests', search: listSearch }}>Yêu cầu thuê</BackLink>

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

type RentalRequestDialog = 'approve' | 'reject'

function RentalRequestDetailContent({ rentalRequest }: { rentalRequest: RentalRequestDetail }) {
  const [openDialog, setOpenDialog] = useState<RentalRequestDialog | null>(null)
  const deadline = rentalRequest.expiresAt ?? rentalRequest.holdExpiresAt
  // Chỉ dùng để so với hạn. Trang đang mở qua mốc hạn thì vẽ lại đúng lúc đó để ẩn các nút, không chờ tải lại.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!deadline) {
      return
    }
    // Thêm 1 ms vì đúng mốc hạn thì chưa tính là quá hạn (`isRentalRequestOverdue`). Hạn đã qua thì vẫn
    // hẹn 1 ms để lấy lại giờ hiện tại sau khi dữ liệu tải lại ra hạn mới.
    const msUntilOverdue = new Date(deadline).getTime() - Date.now()
    const timer = setTimeout(() => setNow(new Date()), Math.max(msUntilOverdue, 0) + 1)
    return () => clearTimeout(timer)
  }, [deadline])

  // Quá hạn mà tác vụ định kỳ chưa chạy thì server vẫn trả `ChoDuyet`/`DaDuyet` nhưng mọi thao tác đã trả `409`.
  const isOverdue = isRentalRequestOverdue(rentalRequest, now)
  const isPending = rentalRequest.status === 'ChoDuyet' && !isOverdue
  const isHolding = rentalRequest.status === 'DaDuyet' && !isOverdue

  // Nút theo trạng thái như trước: chờ duyệt có Duyệt và Từ chối; đã duyệt có Lập hợp đồng và Hủy duyệt.
  const actions =
    isPending || isHolding ? (
      <>
        {isPending && (
          <Button type="button" size="page" onClick={() => setOpenDialog('approve')}>
            <CircleCheck />
            Duyệt
          </Button>
        )}
        {isHolding && (
          <Button asChild size="page">
            <Link to={`/landlord/contracts/new?rentalRequestId=${rentalRequest.id}`}>
              <FilePlus />
              Lập hợp đồng
            </Link>
          </Button>
        )}
        <Button type="button" variant="destructive" size="page" onClick={() => setOpenDialog('reject')}>
          {isHolding ? <Undo2 /> : <CircleX />}
          {isHolding ? 'Hủy duyệt' : 'Từ chối'}
        </Button>
      </>
    ) : null

  return (
    <>
      <DetailHeader
        title={`Yêu cầu thuê phòng ${rentalRequest.room.code}`}
        status={<StatusBadge kind="rentalRequest" status={rentalRequest.status} />}
        subtitle={`${rentalRequest.room.propertyName} · Người thuê: ${rentalRequest.tenantName}`}
      />

      {/* Hộp thoại nằm ngoài nút mở nó: gặp `409` thì trang tải lại sang trạng thái mới, nút có thể biến mất
          nhưng hộp thoại vẫn mở và hiện `detail` để Chủ trọ biết vì sao. */}
      <ApproveDialog
        rentalRequest={rentalRequest}
        open={openDialog === 'approve'}
        onOpenChange={(open) => setOpenDialog(open ? 'approve' : null)}
      />
      <RejectDialog
        rentalRequest={rentalRequest}
        open={openDialog === 'reject'}
        onOpenChange={(open) => setOpenDialog(open ? 'reject' : null)}
      />

      <DetailLayout
        aside={
          <DetailCard title="Người thuê và phòng" stacked>
            <Fact label="Người thuê">{rentalRequest.tenantName}</Fact>
            <Fact label="Phòng">
              Phòng {rentalRequest.room.code} · {rentalRequest.room.propertyName}
            </Fact>
            <Fact label="Ngày dự kiến vào ở">{formatDate(rentalRequest.expectedMoveInDate)}</Fact>
            <Fact label="Số người ở">
              <span className="tabular-nums">{rentalRequest.expectedOccupants} người</span>
            </Fact>
          </DetailCard>
        }
      >
        <RentalRequestStatusNotice rentalRequest={rentalRequest} isOverdue={isOverdue} actions={actions} />

        <DetailCard title="Thông tin yêu cầu">
          <Fact label="Ghi chú của người thuê">
            <span className="font-normal whitespace-pre-line">
              {rentalRequest.note ?? <span className="text-muted-foreground">Không có ghi chú</span>}
            </span>
          </Fact>
          <Fact label="Ngày gửi">{formatDate(rentalRequest.submittedAt)}</Fact>
          {rentalRequest.processedAt && <Fact label="Ngày xử lý">{formatDate(rentalRequest.processedAt)}</Fact>}
        </DetailCard>
      </DetailLayout>
    </>
  )
}

interface RentalRequestStatusNoticeProps {
  rentalRequest: RentalRequestDetail
  /** Đã qua `expiresAt` hoặc `holdExpiresAt` (`isRentalRequestOverdue`). */
  isOverdue: boolean
  /** Nút hành động theo trạng thái, đặt trong khối "Cần bạn làm gì" khi yêu cầu còn chờ Chủ trọ. */
  actions: ReactNode
}

/** Khối đầu trang nói rõ yêu cầu đang ở đâu và Chủ trọ cần làm gì tiếp, theo bảng L5. */
function RentalRequestStatusNotice({ rentalRequest, isOverdue, actions }: RentalRequestStatusNoticeProps) {
  if (isOverdue) {
    return (
      <Alert variant="destructive">
        <TimerOff />
        {rentalRequest.status === 'DaDuyet' ? (
          <>
            <AlertTitle>Đã quá hạn giữ chỗ 72 giờ</AlertTitle>
            <AlertDescription>
              <p>Chưa lập hợp đồng trong hạn nên yêu cầu sẽ tự hết hạn và phòng trở lại Trống.</p>
            </AlertDescription>
          </>
        ) : (
          <>
            <AlertTitle>Đã quá hạn duyệt 168 giờ</AlertTitle>
            <AlertDescription>
              <p>Yêu cầu sẽ tự hết hạn, không duyệt hay từ chối được nữa.</p>
            </AlertDescription>
          </>
        )}
      </Alert>
    )
  }

  switch (rentalRequest.status) {
    case 'ChoDuyet':
      return (
        <ActionPanel title="Yêu cầu đang chờ bạn duyệt" actions={actions}>
          {rentalRequest.expiresAt && (
            <p>
              Hạn duyệt: <CountdownText expiresAt={rentalRequest.expiresAt} className="font-medium" />. Quá hạn thì
              yêu cầu tự hết hạn.
            </p>
          )}
          <p>Duyệt thì phòng được giữ cho người thuê 72 giờ và các yêu cầu đang chờ khác của phòng bị từ chối.</p>
        </ActionPanel>
      )

    case 'DaDuyet':
      return (
        <ActionPanel title="Đã duyệt, phòng đang được giữ cho người thuê" actions={actions}>
          {rentalRequest.holdExpiresAt && (
            <p>
              Giữ chỗ: <CountdownText expiresAt={rentalRequest.holdExpiresAt} className="font-medium" />. Lập hợp đồng
              và nhận cọc trong hạn này; quá hạn mà hợp đồng chưa có hiệu lực thì phòng trở lại Trống.
            </p>
          )}
          {rentalRequest.otherPartyPhoneNumber && (
            <>
              <p>Liên hệ người thuê để thống nhất hợp đồng:</p>
              <Button asChild variant="outline">
                <a href={`tel:${rentalRequest.otherPartyPhoneNumber}`}>
                  <Phone />
                  {rentalRequest.otherPartyPhoneNumber}
                </a>
              </Button>
            </>
          )}
        </ActionPanel>
      )

    case 'DaLapHopDong':
      return (
        <Alert>
          <FileText />
          <AlertTitle>Đã lập hợp đồng từ yêu cầu này</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            {rentalRequest.contractId !== null && (
              <Button asChild variant="outline">
                <Link to={`/landlord/contracts/${rentalRequest.contractId}`}>Xem hợp đồng</Link>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )

    case 'TuChoi':
      return (
        <Alert>
          <CircleX />
          <AlertTitle>Yêu cầu đã bị từ chối</AlertTitle>
          {rentalRequest.rejectReason && (
            <AlertDescription className="whitespace-pre-line wrap-anywhere">
              Lý do: {rentalRequest.rejectReason}
            </AlertDescription>
          )}
        </Alert>
      )

    // `DaHuy` (người thuê đã rút), `HetHan`: chỉ xem, trạng thái đã hiện ở bảng thông tin.
    default:
      return null
  }
}

interface RentalRequestDialogProps {
  rentalRequest: RentalRequestDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Duyệt (FR-30, BR-06): người thuê đang giữ phòng khác thì server trả `409`, hộp thoại hiện `detail`. */
function ApproveDialog({ rentalRequest, open, onOpenChange }: RentalRequestDialogProps) {
  const approveMutation = useLeaseMutation(() => approveRentalRequest(rentalRequest.id))

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Duyệt yêu cầu thuê"
      description={`Phòng ${rentalRequest.room.code} được giữ cho ${rentalRequest.tenantName} trong 72 giờ để lập hợp đồng và nhận cọc; phòng rời khỏi kết quả tìm kiếm. Mọi yêu cầu đang chờ khác của phòng bị từ chối và người gửi nhận thông báo.`}
      confirmLabel="Duyệt"
      isPending={approveMutation.isPending}
      error={approveMutation.error}
      onConfirm={() =>
        approveMutation.mutate(undefined, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã duyệt yêu cầu thuê')
          },
        })
      }
    />
  )
}

/** Từ chối khi chờ duyệt, hoặc hủy duyệt khi đã duyệt (FR-29): bắt buộc lý do, người thuê nhận thông báo kèm lý do. */
function RejectDialog({ rentalRequest, open, onOpenChange }: RentalRequestDialogProps) {
  const rejectMutation = useLeaseMutation((reason: string) => rejectRentalRequest(rentalRequest.id, reason))
  const isHolding = rentalRequest.status === 'DaDuyet'

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isHolding ? 'Hủy duyệt yêu cầu thuê' : 'Từ chối yêu cầu thuê'}
      description={
        isHolding
          ? `Phòng ${rentalRequest.room.code} thôi giữ cho ${rentalRequest.tenantName} và trở lại Trống. Người thuê nhận thông báo kèm lý do. Yêu cầu đã hủy duyệt không khôi phục được.`
          : `${rentalRequest.tenantName} nhận thông báo kèm lý do. Yêu cầu đã từ chối không khôi phục được.`
      }
      reason={{
        label: isHolding ? 'Lý do hủy duyệt' : 'Lý do từ chối',
        required: true,
        placeholder: 'Ví dụ: phòng đã có người đặt trước',
      }}
      confirmLabel={isHolding ? 'Hủy duyệt' : 'Từ chối'}
      destructive
      isPending={rejectMutation.isPending}
      error={rejectMutation.error}
      onConfirm={(reason) =>
        rejectMutation.mutate(reason, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success(isHolding ? 'Đã hủy duyệt yêu cầu thuê' : 'Đã từ chối yêu cầu thuê')
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
