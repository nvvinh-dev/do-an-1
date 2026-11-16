import { CalendarClock, CircleCheck, CircleX, ChevronLeft, Hammer, TimerOff, TriangleAlert, Wrench } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import ConfirmDialog from '@/components/ConfirmDialog'
import CountdownText from '@/components/CountdownText'
import FormDialog, { FormDialogBody } from '@/components/FormDialog'
import MaintenanceRequestImages from '@/components/MaintenanceRequestImages'
import MoneyText from '@/components/MoneyText'
import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useMaintenanceRequest } from '@/hooks/useMaintenanceRequest'
import { useMaintenanceRequestMutation } from '@/hooks/useMaintenanceRequestMutation'
import { isNotFoundError } from '@/lib/apiError'
import NotFoundPage from '@/pages/public/NotFoundPage'
import {
  acceptMaintenanceRequest,
  completeMaintenanceRequest,
  rejectMaintenanceRequest,
  updateMaintenanceExpectedCompletionDate,
} from '@/services/maintenanceRequestService'
import type {
  MaintenanceExpectedCompletionDateRequest,
  MaintenanceRequestDetail,
  RejectMaintenanceRequestRequest,
} from '@/types/maintenanceRequestTypes'
import { formatDate } from '@/utils/formatDate'
import { formatDateTime } from '@/utils/formatDateTime'
import { getLandlordMaintenanceActions } from '@/utils/getLandlordMaintenanceActions'
import { getMaintenanceAutoCloseAt } from '@/utils/getTenantMaintenanceActions'
import { getVietnamToday } from '@/utils/getVietnamToday'
import { validatePaymentAmount } from '@/utils/invoiceForm'
import { getMaintenanceUrgencyLabel } from '@/utils/maintenanceUrgencyLabels'
import { normalizeRoomMoney } from '@/utils/validateRoomInput'

// Lý do từ chối tối đa 500 ký tự (FR-141).
const REJECTION_REASON_MAX_LENGTH = 500

// Sự cố Mới quá 72 giờ thì người thuê được quyền khiếu nại (BP-08 A4).
const ACCEPT_OVERDUE_MS = 72 * 60 * 60 * 1000

/** `state` mà liên kết ở trang danh sách gửi kèm: query lọc và trang đang xem, để nút quay lại giữ nguyên. */
interface MaintenanceRequestDetailLocationState {
  listSearch?: string
}

type OpenDialog = 'accept' | 'changeDate' | 'complete' | 'reject' | null

/**
 * L11 — Chi tiết sự cố cho Chủ trọ (docs/frontend-screens.md mục 6). Hiện theo trạng thái: mới → nút
 * tiếp nhận, từ chối; đang xử lý → nút báo đã sửa xong, sửa ngày dự kiến, từ chối; chờ người thuê
 * xác nhận → đếm ngược tới lúc tự đóng; đã đóng, từ chối, đã hủy → chỉ xem. Thao tác xong thì ở lại
 * trang, hiện `toast` và tải lại dữ liệu.
 */
export default function LandlordMaintenanceRequestDetailPage() {
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
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link to={{ pathname: '/landlord/maintenance-requests', search: listSearch }}>
          <ChevronLeft />
          Sự cố
        </Link>
      </Button>

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

/**
 * Mốc tiếp theo làm đổi cách hiện trang khi đang mở: sự cố Mới qua 72 giờ (hiện cảnh báo khiếu nại),
 * sự cố chờ xác nhận qua 168 giờ (thay đếm ngược bằng câu sẽ tự đóng). `null` khi không có mốc.
 */
function getNextMark(maintenanceRequest: MaintenanceRequestDetail): number | null {
  if (maintenanceRequest.status === 'Moi') {
    const createdAt = new Date(maintenanceRequest.createdAt).getTime()
    return Number.isNaN(createdAt) ? null : createdAt + ACCEPT_OVERDUE_MS
  }
  if (maintenanceRequest.status === 'ChoNguoiThueXacNhan') {
    return getMaintenanceAutoCloseAt(maintenanceRequest.completedAt)?.getTime() ?? null
  }
  return null
}

function MaintenanceRequestDetailContent({ maintenanceRequest }: { maintenanceRequest: MaintenanceRequestDetail }) {
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)
  // Chỉ dùng để so với mốc 72 giờ và 168 giờ. Trang đang mở qua mốc thì vẽ lại đúng lúc đó.
  const [now, setNow] = useState(() => new Date())
  const nextMark = getNextMark(maintenanceRequest)
  useEffect(() => {
    if (nextMark === null) {
      return
    }
    // Thêm 1 ms vì đúng mốc chưa tính là quá hạn. Mốc đã qua thì vẫn hẹn 1 ms để lấy lại giờ hiện tại.
    const timer = setTimeout(() => setNow(new Date()), Math.max(nextMark - Date.now(), 0) + 1)
    return () => clearTimeout(timer)
  }, [nextMark])

  const actions = getLandlordMaintenanceActions(maintenanceRequest, now)
  const autoCloseAt =
    maintenanceRequest.status === 'ChoNguoiThueXacNhan' ? getMaintenanceAutoCloseAt(maintenanceRequest.completedAt) : null
  const isAutoCloseOverdue = autoCloseAt !== null && now.getTime() > autoCloseAt.getTime()
  const closeDialog = (open: boolean) => {
    if (!open) setOpenDialog(null)
  }

  const hasActions =
    actions.canAccept || actions.canComplete || actions.canChangeExpectedCompletionDate || actions.canReject

  return (
    <>
      <PageHeader
        title={maintenanceRequest.title}
        description={`Sự cố #${maintenanceRequest.id} · Phòng ${maintenanceRequest.roomCode} · ${maintenanceRequest.propertyName}`}
        action={
          hasActions && (
            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
              {actions.canChangeExpectedCompletionDate && (
                <Button type="button" variant="outline" size="page" onClick={() => setOpenDialog('changeDate')}>
                  <CalendarClock />
                  Sửa ngày dự kiến
                </Button>
              )}
              {actions.canReject && (
                <Button type="button" variant="outline" size="page" onClick={() => setOpenDialog('reject')}>
                  <CircleX />
                  Từ chối
                </Button>
              )}
              {actions.canAccept && (
                <Button type="button" size="page" onClick={() => setOpenDialog('accept')}>
                  <Hammer />
                  Tiếp nhận
                </Button>
              )}
              {actions.canComplete && (
                <Button type="button" size="page" onClick={() => setOpenDialog('complete')}>
                  <CircleCheck />
                  Báo đã sửa xong
                </Button>
              )}
            </div>
          )
        }
      />

      {/* Hộp thoại nằm ngoài nút để không bị gỡ theo nút khi `409` tải lại sang trạng thái mới: vẫn mở và hiện `detail`. */}
      <ExpectedCompletionDateDialog
        mode="accept"
        maintenanceRequest={maintenanceRequest}
        open={openDialog === 'accept'}
        onOpenChange={closeDialog}
      />
      <ExpectedCompletionDateDialog
        mode="change"
        maintenanceRequest={maintenanceRequest}
        open={openDialog === 'changeDate'}
        onOpenChange={closeDialog}
      />
      <CompleteDialog maintenanceRequest={maintenanceRequest} open={openDialog === 'complete'} onOpenChange={closeDialog} />
      <RejectDialog maintenanceRequest={maintenanceRequest} open={openDialog === 'reject'} onOpenChange={closeDialog} />

      <MaintenanceRequestStatusNotice
        maintenanceRequest={maintenanceRequest}
        isAcceptOverdue={actions.isAcceptOverdue}
        autoCloseAt={autoCloseAt}
        isAutoCloseOverdue={isAutoCloseOverdue}
      />

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6">
        <h2 className="text-lg font-medium">Thông tin sự cố</h2>
        <dl className="grid gap-4 text-sm md:grid-cols-[12rem_1fr]">
          <dt className="text-muted-foreground">Trạng thái</dt>
          <dd>
            <StatusBadge kind="maintenanceRequest" status={maintenanceRequest.status} />
          </dd>

          <dt className="text-muted-foreground">Người thuê</dt>
          <dd className="wrap-anywhere">{maintenanceRequest.tenantFullName}</dd>

          <dt className="text-muted-foreground">Phòng</dt>
          <dd className="wrap-anywhere">
            Phòng {maintenanceRequest.roomCode} · {maintenanceRequest.propertyName}
          </dd>

          <dt className="text-muted-foreground">Hợp đồng</dt>
          <dd>
            <Link
              to={`/landlord/contracts/${maintenanceRequest.contractId}`}
              className="underline-offset-4 hover:underline"
            >
              Hợp đồng #{maintenanceRequest.contractId}
            </Link>
          </dd>

          <dt className="text-muted-foreground">Mức khẩn cấp</dt>
          <dd>{getMaintenanceUrgencyLabel(maintenanceRequest.urgency)}</dd>

          <dt className="text-muted-foreground">Mô tả</dt>
          <dd className="whitespace-pre-line wrap-anywhere">{maintenanceRequest.description}</dd>

          <dt className="text-muted-foreground">Ngày gửi</dt>
          <dd>{formatDateTime(maintenanceRequest.createdAt)}</dd>

          {maintenanceRequest.acceptedAt && (
            <>
              <dt className="text-muted-foreground">Ngày tiếp nhận</dt>
              <dd>{formatDateTime(maintenanceRequest.acceptedAt)}</dd>
            </>
          )}

          {maintenanceRequest.expectedCompletionDate && (
            <>
              <dt className="text-muted-foreground">Dự kiến sửa xong</dt>
              <dd>{formatDate(maintenanceRequest.expectedCompletionDate)}</dd>
            </>
          )}

          {maintenanceRequest.completedAt && (
            <>
              <dt className="text-muted-foreground">Báo sửa xong</dt>
              <dd>{formatDateTime(maintenanceRequest.completedAt)}</dd>
            </>
          )}
        </dl>
      </div>

      <MaintenanceRequestImages images={maintenanceRequest.images} />
    </>
  )
}

interface MaintenanceRequestStatusNoticeProps {
  maintenanceRequest: MaintenanceRequestDetail
  isAcceptOverdue: boolean
  /** `completedAt` + 168 giờ, chỉ có khi chờ người thuê xác nhận. */
  autoCloseAt: Date | null
  isAutoCloseOverdue: boolean
}

/** Khối đầu trang nói rõ sự cố đang ở đâu và Chủ trọ cần làm gì tiếp, theo bảng L11. */
function MaintenanceRequestStatusNotice({
  maintenanceRequest,
  isAcceptOverdue,
  autoCloseAt,
  isAutoCloseOverdue,
}: MaintenanceRequestStatusNoticeProps) {
  switch (maintenanceRequest.status) {
    case 'Moi':
      if (isAcceptOverdue) {
        return (
          <Alert className="border-warning/40">
            <TriangleAlert />
            <AlertTitle>Đã quá 72 giờ chưa tiếp nhận</AlertTitle>
            <AlertDescription>
              <p>
                Người thuê đã được quyền gửi khiếu nại tới Admin về sự cố này. Bạn vẫn tiếp nhận hoặc từ chối được.
              </p>
            </AlertDescription>
          </Alert>
        )
      }
      return (
        <Alert>
          <Wrench />
          <AlertTitle>Sự cố mới, chờ bạn tiếp nhận</AlertTitle>
          <AlertDescription>
            <p>
              Tiếp nhận để báo người thuê bạn đang xử lý, kèm ngày dự kiến sửa xong nếu đã hẹn thợ. Hỏng do người thuê
              hoặc không thuộc trách nhiệm của bạn thì từ chối kèm lý do.
            </p>
          </AlertDescription>
        </Alert>
      )

    case 'DangXuLy':
      return (
        <Alert>
          <Hammer />
          <AlertTitle>Đang xử lý</AlertTitle>
          <AlertDescription>
            <p>
              {maintenanceRequest.expectedCompletionDate
                ? `Dự kiến sửa xong ngày ${formatDate(maintenanceRequest.expectedCompletionDate)}.`
                : 'Chưa ghi ngày dự kiến sửa xong.'}{' '}
              Sửa xong thì bấm Báo đã sửa xong để người thuê kiểm tra lại.
            </p>
            {maintenanceRequest.notFixedReason && (
              <p className="whitespace-pre-line wrap-anywhere">
                Người thuê báo chưa đạt: {maintenanceRequest.notFixedReason}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )

    case 'ChoNguoiThueXacNhan':
      if (isAutoCloseOverdue) {
        return (
          <Alert>
            <TimerOff />
            <AlertTitle>Đã quá 7 ngày chờ người thuê xác nhận</AlertTitle>
            <AlertDescription>
              <p>Sự cố sẽ tự đóng, bạn nhận thông báo khi hệ thống đóng.</p>
            </AlertDescription>
          </Alert>
        )
      }
      return (
        <Alert className="border-success/40">
          <CircleCheck />
          <AlertTitle>Chờ người thuê xác nhận</AlertTitle>
          <AlertDescription>
            <p>Người thuê xác nhận đã khắc phục thì sự cố đóng; báo chưa đạt thì sự cố quay lại Đang xử lý.</p>
            {autoCloseAt && (
              <p>
                Người thuê không phản hồi thì sự cố tự đóng:{' '}
                <CountdownText expiresAt={autoCloseAt.toISOString()} className="font-medium" />.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )

    case 'DaDong':
      return (
        <Alert>
          <CircleCheck />
          <AlertTitle>Sự cố đã đóng</AlertTitle>
          <AlertDescription>
            <p>
              {maintenanceRequest.isAutoClosed
                ? 'Hệ thống tự đóng vì người thuê không phản hồi trong 7 ngày sau khi bạn báo sửa xong.'
                : 'Người thuê đã xác nhận sự cố được khắc phục.'}
              {maintenanceRequest.closedAt && ` Ngày đóng: ${formatDate(maintenanceRequest.closedAt)}.`}
            </p>
          </AlertDescription>
        </Alert>
      )

    case 'TuChoi':
      return (
        <Alert>
          <CircleX />
          <AlertTitle>Bạn đã từ chối sự cố này</AlertTitle>
          <AlertDescription>
            {maintenanceRequest.rejectionReason && (
              <p className="whitespace-pre-line wrap-anywhere">Lý do: {maintenanceRequest.rejectionReason}</p>
            )}
            {maintenanceRequest.estimatedCompensation !== null && (
              <p>
                Bồi thường dự kiến: <MoneyText amount={maintenanceRequest.estimatedCompensation} className="font-medium" />.
                Hệ thống không tự thu khoản này: thêm dòng Điều chỉnh ở hóa đơn kỳ tới hoặc dòng Bồi thường hư hỏng khi
                thanh lý, mô tả ghi “Sự cố #{maintenanceRequest.id}”.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )

    case 'DaHuy':
      return (
        <Alert>
          <CircleX />
          <AlertTitle>Người thuê đã hủy sự cố này</AlertTitle>
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

interface ExpectedCompletionDateDialogProps extends MaintenanceDialogProps {
  /** `accept`: tiếp nhận sự cố Mới; `change`: sửa ngày khi Đang xử lý. Cùng một ô ngày, cùng quy tắc. */
  mode: 'accept' | 'change'
}

function ExpectedCompletionDateDialog({ mode, maintenanceRequest, open, onOpenChange }: ExpectedCompletionDateDialogProps) {
  const mutation = useMaintenanceRequestMutation((request: MaintenanceExpectedCompletionDateRequest) =>
    mode === 'accept'
      ? acceptMaintenanceRequest(maintenanceRequest.id, request)
      : updateMaintenanceExpectedCompletionDate(maintenanceRequest.id, request),
  )

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} isPending={mutation.isPending}>
      <ExpectedCompletionDateBody
        mode={mode}
        initialDate={mode === 'change' ? (maintenanceRequest.expectedCompletionDate ?? '') : ''}
        isPending={mutation.isPending}
        error={mutation.error}
        onSubmit={(request) =>
          mutation.mutate(request, {
            onSuccess: () => {
              onOpenChange(false)
              toast.success(mode === 'accept' ? 'Đã tiếp nhận sự cố' : 'Đã cập nhật ngày dự kiến')
            },
          })
        }
      />
    </FormDialog>
  )
}

interface ExpectedCompletionDateBodyProps {
  mode: 'accept' | 'change'
  initialDate: string
  isPending: boolean
  error: unknown
  onSubmit: (request: MaintenanceExpectedCompletionDateRequest) => void
}

function ExpectedCompletionDateBody({ mode, initialDate, isPending, error, onSubmit }: ExpectedCompletionDateBodyProps) {
  const [date, setDate] = useState(initialDate)
  const [showErrors, setShowErrors] = useState(false)
  const dateId = useId()

  const today = getVietnamToday()
  // Ô `date` trả `YYYY-MM-DD`, cùng dạng với `today` nên so sánh chuỗi trực tiếp được. Để trống là không ghi ngày.
  const dateError = date !== '' && date < today ? 'Ngày dự kiến không được trước hôm nay.' : null

  return (
    <FormDialogBody
      title={mode === 'accept' ? 'Tiếp nhận sự cố' : 'Sửa ngày dự kiến sửa xong'}
      description={
        mode === 'accept'
          ? 'Sự cố chuyển sang Đang xử lý, người thuê nhận thông báo kèm ngày dự kiến nếu có.'
          : 'Người thuê thấy ngày mới ở trang sự cố; thao tác này không gửi thông báo.'
      }
      confirmLabel={mode === 'accept' ? 'Tiếp nhận' : 'Lưu'}
      isPending={isPending}
      error={error}
      validate={() => {
        setShowErrors(true)
        return dateError === null
      }}
      onSubmit={() => onSubmit({ expectedCompletionDate: date === '' ? null : date })}
    >
      <Field data-invalid={showErrors && dateError !== null}>
        <FieldLabel htmlFor={dateId}>Ngày dự kiến sửa xong</FieldLabel>
        <Input
          id={dateId}
          type="date"
          min={today}
          value={date}
          onChange={(event) => setDate(event.target.value)}
          disabled={isPending}
          aria-invalid={showErrors && dateError !== null}
        />
        <FieldDescription>Không bắt buộc. Để trống nếu chưa hẹn được thợ.</FieldDescription>
        {showErrors && dateError && <FieldError>{dateError}</FieldError>}
      </Field>
    </FormDialogBody>
  )
}

function CompleteDialog({ maintenanceRequest, open, onOpenChange }: MaintenanceDialogProps) {
  const completeMutation = useMaintenanceRequestMutation(() => completeMaintenanceRequest(maintenanceRequest.id))

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Báo đã sửa xong"
      description="Sự cố chuyển sang Chờ người thuê xác nhận, người thuê nhận thông báo. Người thuê không phản hồi trong 7 ngày thì sự cố tự đóng."
      confirmLabel="Báo đã sửa xong"
      isPending={completeMutation.isPending}
      error={completeMutation.error}
      onConfirm={() =>
        completeMutation.mutate(undefined, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã báo người thuê sự cố đã sửa xong')
          },
        })
      }
    />
  )
}

function RejectDialog({ maintenanceRequest, open, onOpenChange }: MaintenanceDialogProps) {
  const rejectMutation = useMaintenanceRequestMutation((request: RejectMaintenanceRequestRequest) =>
    rejectMaintenanceRequest(maintenanceRequest.id, request),
  )

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} isPending={rejectMutation.isPending}>
      <RejectBody
        isPending={rejectMutation.isPending}
        error={rejectMutation.error}
        onSubmit={(request) =>
          rejectMutation.mutate(request, {
            onSuccess: () => {
              onOpenChange(false)
              toast.success('Đã từ chối sự cố')
            },
          })
        }
      />
    </FormDialog>
  )
}

interface RejectBodyProps {
  isPending: boolean
  error: unknown
  onSubmit: (request: RejectMaintenanceRequestRequest) => void
}

function RejectBody({ isPending, error, onSubmit }: RejectBodyProps) {
  const [reason, setReason] = useState('')
  const [compensation, setCompensation] = useState('')
  const [compensationFocused, setCompensationFocused] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const baseId = useId()
  const reasonId = `${baseId}-reason`
  const compensationId = `${baseId}-compensation`

  const trimmedReason = reason.trim()
  const reasonError =
    trimmedReason === ''
      ? 'Vui lòng ghi lý do từ chối.'
      : trimmedReason.length > REJECTION_REASON_MAX_LENGTH
        ? `Lý do tối đa ${REJECTION_REASON_MAX_LENGTH} ký tự.`
        : null
  // Bồi thường dự kiến không bắt buộc; có nhập thì là số đồng nguyên lớn hơn 0 (FR-141).
  const compensationValidation = compensation.trim() === '' ? true : validatePaymentAmount(compensation)
  const compensationError = compensationValidation === true ? null : compensationValidation
  // Hiện dấu chấm hàng nghìn khi rời ô, như ô số tiền ở các màn khác (docs/design-system.md mục 8).
  const compensationDisplay =
    !compensationFocused && compensation.trim() !== '' && compensationError === null
      ? Number(normalizeRoomMoney(compensation)).toLocaleString('vi-VN')
      : compensation

  return (
    <FormDialogBody
      title="Từ chối sự cố"
      description="Sự cố chuyển sang Từ chối và không mở lại được, người thuê nhận thông báo kèm lý do."
      confirmLabel="Từ chối"
      isPending={isPending}
      error={error}
      validate={() => {
        setShowErrors(true)
        return reasonError === null && compensationError === null
      }}
      onSubmit={() =>
        onSubmit({
          reason: trimmedReason,
          estimatedCompensation: compensation.trim() === '' ? null : Number(normalizeRoomMoney(compensation)),
        })
      }
    >
      <Field data-invalid={showErrors && reasonError !== null}>
        <FieldLabel htmlFor={reasonId}>
          Lý do <span aria-hidden="true">*</span>
        </FieldLabel>
        <Textarea
          id={reasonId}
          value={reason}
          maxLength={REJECTION_REASON_MAX_LENGTH}
          placeholder="Ví dụ: kính cửa sổ vỡ do va đập, không phải hao mòn."
          onChange={(event) => setReason(event.target.value)}
          disabled={isPending}
          aria-invalid={showErrors && reasonError !== null}
        />
        <FieldDescription>
          {reason.length}/{REJECTION_REASON_MAX_LENGTH} ký tự
        </FieldDescription>
        {showErrors && reasonError && <FieldError>{reasonError}</FieldError>}
      </Field>

      <Field data-invalid={showErrors && compensationError !== null}>
        <FieldLabel htmlFor={compensationId}>Bồi thường dự kiến (đồng)</FieldLabel>
        <Input
          id={compensationId}
          value={compensationDisplay}
          inputMode="numeric"
          className="tabular-nums"
          disabled={isPending}
          aria-invalid={showErrors && compensationError !== null}
          onFocus={() => setCompensationFocused(true)}
          onBlur={() => {
            setCompensationFocused(false)
            setCompensation(normalizeRoomMoney(compensation))
          }}
          onChange={(event) => setCompensation(event.target.value)}
        />
        <FieldDescription>
          Không bắt buộc, chỉ là ghi chú. Thu thì thêm dòng ở hóa đơn kỳ tới hoặc hóa đơn thanh lý.
        </FieldDescription>
        {showErrors && compensationError && <FieldError>{compensationError}</FieldError>}
      </Field>
    </FormDialogBody>
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
