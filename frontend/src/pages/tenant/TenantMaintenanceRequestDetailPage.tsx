import { CircleCheck, CircleX, Hammer, RotateCcw, Wrench } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useLocation, useParams } from 'react-router'
import { toast } from 'sonner'
import ActionPanel from '@/components/ActionPanel'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import BackLink from '@/components/BackLink'
import ConfirmDialog from '@/components/ConfirmDialog'
import CountdownText from '@/components/CountdownText'
import DetailCard from '@/components/DetailCard'
import DetailHeader from '@/components/DetailHeader'
import DetailLayout from '@/components/DetailLayout'
import { Fact } from '@/components/FactList'
import MaintenanceRequestImages from '@/components/MaintenanceRequestImages'
import MoneyText from '@/components/MoneyText'
import StatusBadge from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMaintenanceRequest } from '@/hooks/useMaintenanceRequest'
import { useMaintenanceRequestMutation } from '@/hooks/useMaintenanceRequestMutation'
import { isNotFoundError } from '@/lib/apiError'
import NotFoundPage from '@/pages/public/NotFoundPage'
import {
  cancelMaintenanceRequest,
  confirmMaintenanceRequest,
  reportMaintenanceRequestNotFixed,
} from '@/services/maintenanceRequestService'
import type { MaintenanceRequestDetail } from '@/types/maintenanceRequestTypes'
import { formatDate } from '@/utils/formatDate'
import { formatDateTime } from '@/utils/formatDateTime'
import { getMaintenanceAutoCloseAt, getTenantMaintenanceActions } from '@/utils/getTenantMaintenanceActions'
import { getMaintenanceUrgencyLabel } from '@/utils/maintenanceUrgencyLabels'

// Lý do chưa đạt tối đa 500 ký tự (FR-143).
const NOT_FIXED_REASON_MAX_LENGTH = 500

/** `state` mà liên kết ở trang danh sách gửi kèm: query lọc và trang đang xem, để nút quay lại giữ nguyên. */
interface MaintenanceRequestDetailLocationState {
  listSearch?: string
}

type OpenDialog = 'cancel' | 'confirm' | 'notFixed' | null

/**
 * T10 — Chi tiết sự cố (docs/frontend-screens.md mục 5). Hiện theo trạng thái: mới, đang xử lý →
 * nút hủy; chờ người thuê xác nhận → đếm ngược tới lúc tự đóng, nút xác nhận đã khắc phục và chưa
 * đạt; đã đóng, từ chối, đã hủy → chỉ xem. Thao tác xong thì ở lại trang, hiện `toast` và tải lại
 * dữ liệu.
 */
export default function TenantMaintenanceRequestDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  // Mở thẳng từ thông báo thì không có `state`: quay về danh sách không lọc.
  const listSearch = (location.state as MaintenanceRequestDetailLocationState | null)?.listSearch ?? ''
  // Id không phải số thì server trả 404 như sự cố không thuộc mình.
  const maintenanceRequestId = Number(id)
  const maintenanceRequestQuery = useMaintenanceRequest(maintenanceRequestId)

  if (isNotFoundError(maintenanceRequestQuery.error)) {
    return <NotFoundPage />
  }

  return (
    <section className="flex flex-col gap-6">
      <BackLink to={{ pathname: '/tenant/maintenance-requests', search: listSearch }}>Sự cố</BackLink>

      {maintenanceRequestQuery.isPending ? (
        <MaintenanceRequestDetailSkeleton />
      ) : maintenanceRequestQuery.isLoadingError ? (
        <ApiErrorAlert error={maintenanceRequestQuery.error} onRetry={() => void maintenanceRequestQuery.refetch()} />
      ) : (
        <>
          {/* Lần tải lại lỗi (quay lại tab, tải lại sau `409`) thì giữ nội dung cũ và hộp thoại đang mở, chỉ báo lỗi kèm nút thử lại. */}
          {maintenanceRequestQuery.isRefetchError && (
            <ApiErrorAlert error={maintenanceRequestQuery.error} onRetry={() => void maintenanceRequestQuery.refetch()} />
          )}
          <MaintenanceRequestDetailContent maintenanceRequest={maintenanceRequestQuery.data} />
        </>
      )}
    </section>
  )
}

function MaintenanceRequestDetailContent({ maintenanceRequest }: { maintenanceRequest: MaintenanceRequestDetail }) {
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)
  const autoCloseAt =
    maintenanceRequest.status === 'ChoNguoiThueXacNhan' ? getMaintenanceAutoCloseAt(maintenanceRequest.completedAt) : null
  // Chỉ dùng để so với mốc tự đóng. Trang đang mở qua mốc thì vẽ lại đúng lúc đó để ẩn nút chưa đạt,
  // không chờ tải lại dữ liệu.
  const [now, setNow] = useState(() => new Date())
  const autoCloseTime = autoCloseAt?.getTime() ?? null
  useEffect(() => {
    if (autoCloseTime === null) {
      return
    }
    // Thêm 1 ms vì đúng mốc chưa tính là quá hạn. Mốc đã qua thì vẫn hẹn 1 ms để lấy lại giờ hiện tại:
    // tải lại ra lần báo sửa xong mới mà giữ `now` lúc mở trang thì tính sai.
    const timer = setTimeout(() => setNow(new Date()), Math.max(autoCloseTime - Date.now(), 0) + 1)
    return () => clearTimeout(timer)
  }, [autoCloseTime])
  const actions = getTenantMaintenanceActions(maintenanceRequest, now)
  const closeDialog = (open: boolean) => {
    if (!open) setOpenDialog(null)
  }

  // Xác nhận và Chưa đạt là việc chính, nằm trong khối "Cần bạn làm gì"; Hủy sự cố ở đầu trang.
  const confirmActions =
    actions.canConfirm || actions.canReportNotFixed ? (
      <>
        {actions.canConfirm && (
          <Button type="button" size="page" onClick={() => setOpenDialog('confirm')}>
            <CircleCheck />
            Xác nhận đã khắc phục
          </Button>
        )}
        {actions.canReportNotFixed && (
          <Button type="button" variant="outline" size="page" onClick={() => setOpenDialog('notFixed')}>
            <RotateCcw />
            Chưa đạt
          </Button>
        )}
      </>
    ) : null

  return (
    <>
      <DetailHeader
        title={maintenanceRequest.title}
        status={<StatusBadge kind="maintenanceRequest" status={maintenanceRequest.status} />}
        subtitle={`Sự cố #${maintenanceRequest.id} · Phòng ${maintenanceRequest.roomCode} · ${maintenanceRequest.propertyName} · Mức khẩn cấp: ${getMaintenanceUrgencyLabel(maintenanceRequest.urgency)}`}
        action={
          actions.canCancel && (
            <Button type="button" variant="destructive" onClick={() => setOpenDialog('cancel')}>
              <CircleX />
              Hủy sự cố
            </Button>
          )
        }
      />

      {/* Hộp thoại nằm ngoài nút để không bị gỡ theo nút khi `409` tải lại sang trạng thái mới: vẫn mở và hiện `detail`. */}
      <CancelDialog maintenanceRequest={maintenanceRequest} open={openDialog === 'cancel'} onOpenChange={closeDialog} />
      <ConfirmFixedDialog
        maintenanceRequest={maintenanceRequest}
        open={openDialog === 'confirm'}
        onOpenChange={closeDialog}
      />
      <NotFixedDialog maintenanceRequest={maintenanceRequest} open={openDialog === 'notFixed'} onOpenChange={closeDialog} />

      <DetailLayout
        aside={
          <DetailCard title="Thời gian xử lý" stacked>
            <Fact label="Phòng">
              Phòng {maintenanceRequest.roomCode} · {maintenanceRequest.propertyName}
            </Fact>
            <Fact label="Ngày gửi">{formatDateTime(maintenanceRequest.createdAt)}</Fact>
            {maintenanceRequest.acceptedAt && (
              <Fact label="Ngày tiếp nhận">{formatDateTime(maintenanceRequest.acceptedAt)}</Fact>
            )}
            {maintenanceRequest.expectedCompletionDate && (
              <Fact label="Dự kiến sửa xong">{formatDate(maintenanceRequest.expectedCompletionDate)}</Fact>
            )}
            {maintenanceRequest.completedAt && (
              <Fact label="Báo sửa xong">{formatDateTime(maintenanceRequest.completedAt)}</Fact>
            )}
          </DetailCard>
        }
      >
        <MaintenanceRequestStatusNotice
          maintenanceRequest={maintenanceRequest}
          autoCloseAt={autoCloseAt}
          isAutoCloseOverdue={actions.isAutoCloseOverdue}
          confirmActions={confirmActions}
        />

        <DetailCard title="Thông tin sự cố">
          <Fact label="Mức khẩn cấp">{getMaintenanceUrgencyLabel(maintenanceRequest.urgency)}</Fact>
          <Fact label="Mô tả">
            <span className="font-normal whitespace-pre-line">{maintenanceRequest.description}</span>
          </Fact>
        </DetailCard>

        <MaintenanceRequestImages images={maintenanceRequest.images} />
      </DetailLayout>
    </>
  )
}

interface MaintenanceRequestStatusNoticeProps {
  maintenanceRequest: MaintenanceRequestDetail
  /** `completedAt` + 168 giờ, chỉ có khi chờ người thuê xác nhận. */
  autoCloseAt: Date | null
  isAutoCloseOverdue: boolean
  /** Nút xác nhận, chưa đạt, đặt trong khối "Cần bạn làm gì" khi Chủ trọ đã báo sửa xong. */
  confirmActions: ReactNode
}

/** Khối đầu trang nói rõ sự cố đang ở đâu và người thuê cần làm gì tiếp, theo bảng T10. */
function MaintenanceRequestStatusNotice({
  maintenanceRequest,
  autoCloseAt,
  isAutoCloseOverdue,
  confirmActions,
}: MaintenanceRequestStatusNoticeProps) {
  switch (maintenanceRequest.status) {
    case 'Moi':
      return (
        <Alert>
          <Wrench />
          <AlertTitle>Đang chờ Chủ trọ tiếp nhận</AlertTitle>
          <AlertDescription>
            <p>Chủ trọ đã nhận thông báo. Bạn nhận được thông báo khi Chủ trọ tiếp nhận hoặc từ chối.</p>
          </AlertDescription>
        </Alert>
      )

    case 'DangXuLy':
      return (
        <Alert>
          <Hammer />
          <AlertTitle>Chủ trọ đang xử lý</AlertTitle>
          <AlertDescription>
            <p>
              {maintenanceRequest.expectedCompletionDate
                ? `Dự kiến sửa xong ngày ${formatDate(maintenanceRequest.expectedCompletionDate)}.`
                : 'Chủ trọ chưa ghi ngày dự kiến sửa xong.'}
            </p>
            {maintenanceRequest.notFixedReason && (
              <p className="whitespace-pre-line wrap-anywhere">
                Lần trước bạn báo chưa đạt: {maintenanceRequest.notFixedReason}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )

    case 'ChoNguoiThueXacNhan':
      if (isAutoCloseOverdue) {
        // Server vẫn nhận xác nhận khi đã quá hạn nhưng chưa tới lượt tác vụ đóng (FR-143), nên nút Xác nhận vẫn hiện.
        return (
          <ActionPanel title="Đã quá 7 ngày chờ xác nhận" actions={confirmActions}>
            <p>
              Sự cố sẽ tự đóng. Không báo chưa đạt được nữa; muốn báo hỏng lại thì gửi sự cố mới. Bạn vẫn xác nhận đã
              khắc phục được.
            </p>
          </ActionPanel>
        )
      }
      return (
        <ActionPanel title="Chủ trọ báo đã sửa xong" actions={confirmActions}>
          <p>Kiểm tra lại rồi bấm Xác nhận đã khắc phục, hoặc Chưa đạt kèm lý do nếu vẫn còn hỏng.</p>
          {autoCloseAt && (
            <p>
              Không phản hồi thì sự cố tự đóng:{' '}
              <CountdownText expiresAt={autoCloseAt.toISOString()} className="font-medium" />.
            </p>
          )}
        </ActionPanel>
      )

    case 'DaDong':
      return (
        <Alert>
          <CircleCheck />
          <AlertTitle>Sự cố đã đóng</AlertTitle>
          <AlertDescription>
            <p>
              {maintenanceRequest.isAutoClosed
                ? 'Hệ thống tự đóng vì quá 7 ngày không phản hồi sau khi Chủ trọ báo sửa xong.'
                : 'Bạn đã xác nhận sự cố được khắc phục.'}
              {maintenanceRequest.closedAt && ` Ngày đóng: ${formatDate(maintenanceRequest.closedAt)}.`}
            </p>
          </AlertDescription>
        </Alert>
      )

    case 'TuChoi':
      return (
        <Alert>
          <CircleX />
          <AlertTitle>Chủ trọ từ chối sửa</AlertTitle>
          <AlertDescription>
            {maintenanceRequest.rejectionReason && (
              <p className="whitespace-pre-line wrap-anywhere">Lý do: {maintenanceRequest.rejectionReason}</p>
            )}
            {maintenanceRequest.estimatedCompensation !== null && (
              <p>
                Bồi thường dự kiến: <MoneyText amount={maintenanceRequest.estimatedCompensation} className="font-medium" />.
                Đây là số Chủ trọ ghi chú; nếu thu, Chủ trọ đưa vào hóa đơn kỳ tới hoặc hóa đơn thanh lý, không tự trừ
                vào đâu.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )

    case 'DaHuy':
      return (
        <Alert>
          <CircleX />
          <AlertTitle>Bạn đã hủy sự cố này</AlertTitle>
          {maintenanceRequest.cancelledAt && (
            <AlertDescription>
              <p>Ngày hủy: {formatDate(maintenanceRequest.cancelledAt)}.</p>
            </AlertDescription>
          )}
        </Alert>
      )
  }
}

interface MaintenanceDialogProps {
  maintenanceRequest: MaintenanceRequestDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CancelDialog({ maintenanceRequest, open, onOpenChange }: MaintenanceDialogProps) {
  const cancelMutation = useMaintenanceRequestMutation(() => cancelMaintenanceRequest(maintenanceRequest.id))

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Hủy sự cố"
      description="Chủ trọ sẽ không xử lý sự cố này nữa và nhận thông báo đã hủy. Sự cố đã hủy không khôi phục được; còn hỏng thì gửi sự cố mới."
      confirmLabel="Hủy sự cố"
      cancelLabel="Đóng"
      destructive
      isPending={cancelMutation.isPending}
      error={cancelMutation.error}
      onConfirm={() =>
        cancelMutation.mutate(undefined, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã hủy sự cố')
          },
        })
      }
    />
  )
}

function ConfirmFixedDialog({ maintenanceRequest, open, onOpenChange }: MaintenanceDialogProps) {
  const confirmMutation = useMaintenanceRequestMutation(() => confirmMaintenanceRequest(maintenanceRequest.id))

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Xác nhận đã khắc phục"
      description="Sự cố sẽ đóng và không mở lại được. Sau này hỏng lại thì gửi sự cố mới."
      confirmLabel="Xác nhận"
      isPending={confirmMutation.isPending}
      error={confirmMutation.error}
      onConfirm={() =>
        confirmMutation.mutate(undefined, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã đóng sự cố')
          },
        })
      }
    />
  )
}

function NotFixedDialog({ maintenanceRequest, open, onOpenChange }: MaintenanceDialogProps) {
  const notFixedMutation = useMaintenanceRequestMutation((reason: string) =>
    reportMaintenanceRequestNotFixed(maintenanceRequest.id, reason),
  )

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Báo chưa đạt"
      description="Sự cố quay lại Đang xử lý để Chủ trọ sửa tiếp, Chủ trọ nhận thông báo kèm lý do của bạn."
      confirmLabel="Gửi"
      reason={{
        label: 'Lý do chưa đạt',
        required: true,
        maxLength: NOT_FIXED_REASON_MAX_LENGTH,
        placeholder: 'Ví dụ: vòi vẫn rỉ nước khi đã khóa.',
      }}
      isPending={notFixedMutation.isPending}
      error={notFixedMutation.error}
      onConfirm={(reason) =>
        notFixedMutation.mutate(reason, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã báo chưa đạt cho Chủ trọ')
          },
        })
      }
    />
  )
}

function MaintenanceRequestDetailSkeleton() {
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
