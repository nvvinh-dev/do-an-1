import { useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, CircleCheckBig, Lock, Pencil, Send, TriangleAlert } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import ConfirmDialog from '@/components/ConfirmDialog'
import FormDialog, { FormDialogBody } from '@/components/FormDialog'
import MoneyText from '@/components/MoneyText'
import PageHeader from '@/components/PageHeader'
import SettlementInvoiceForm from '@/components/SettlementInvoiceForm'
import SettlementInvoiceSummary from '@/components/SettlementInvoiceSummary'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { contractQueryKey, useContract } from '@/hooks/useContract'
import { useContractInvoices } from '@/hooks/useContractInvoices'
import { invoiceQueryKey, useInvoice } from '@/hooks/useInvoice'
import { useLatestContractMeterReading } from '@/hooks/useLatestContractMeterReading'
import { useSettlementMutation } from '@/hooks/useSettlementMutation'
import { isNotFoundError } from '@/lib/apiError'
import NotFoundPage from '@/pages/public/NotFoundPage'
import {
  completeSettlement,
  createSettlementInvoice,
  finalizeSettlementInvoice,
  sendSettlementInvoice,
  updateSettlementInvoice,
} from '@/services/settlementService'
import type { ContractDetail } from '@/types/contractTypes'
import type { InvoiceDetail } from '@/types/invoiceTypes'
import type { PaymentMethod } from '@/types/paymentTypes'
import type { CompleteSettlementRequest, RoomNextStatus, SettlementInvoiceRequest } from '@/types/settlementTypes'
import { formatDate } from '@/utils/formatDate'
import { formatDateTime } from '@/utils/formatDateTime'
import { getSettlementActions, type SettlementActions } from '@/utils/getSettlementActions'
import { getVietnamToday } from '@/utils/getVietnamToday'
import { getPaymentMethodLabel } from '@/utils/paymentMethodLabels'
import { getNewSettlementFormValues, getSettlementFormValues, isSettlementLineCategory } from '@/utils/settlementForm'
import { getStatusDisplay } from '@/utils/statusLabels'
import { toVietnamDateTimeInput, vietnamDateTimeInputToIso } from '@/utils/vietnamDateTimeInput'

const PAYMENT_METHODS: PaymentMethod[] = ['TienMat', 'ChuyenKhoan']
const ROOM_NEXT_STATUSES: RoomNextStatus[] = ['Trong', 'BaoTri']

/**
 * L9 — Thanh lý (docs/frontend-screens.md mục 6), mở từ L6 và L8. Nút theo bảng "L9 — thao tác theo trạng
 * thái" (`getSettlementActions`): chưa có bảng → form lập; nháp → sửa, gửi cho người thuê, hiện lý do chưa đồng
 * ý gần nhất; chờ người thuê → tự chốt khi quá 7 ngày từ lần gửi; đã khóa → hoàn tất thanh lý. Tự chốt và hoàn
 * tất không hoàn tác nên có hộp thoại xác nhận (FR-75). Số dư luôn hiện rõ chiều (FR-58).
 */
export default function SettlementPage() {
  const { id } = useParams()
  const contractId = Number(id)
  // Id không phải số thì server trả 404 như hợp đồng không thuộc mình.
  const contractQuery = useContract(contractId)
  const invoiceQuery = useInvoice(contractQuery.data?.settlementInvoiceId ?? null)

  if (isNotFoundError(contractQuery.error) || isNotFoundError(invoiceQuery.error)) {
    return <NotFoundPage />
  }

  const hasInvoice = contractQuery.data?.settlementInvoiceId != null

  return (
    <section className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link to={`/landlord/contracts/${id}`}>
          <ChevronLeft />
          Hợp đồng
        </Link>
      </Button>

      {contractQuery.isPending || (hasInvoice && invoiceQuery.isPending) ? (
        <SettlementSkeleton />
      ) : contractQuery.isLoadingError ? (
        <ApiErrorAlert error={contractQuery.error} onRetry={() => void contractQuery.refetch()} />
      ) : hasInvoice && invoiceQuery.isLoadingError ? (
        <ApiErrorAlert error={invoiceQuery.error} onRetry={() => void invoiceQuery.refetch()} />
      ) : (
        <>
          {/* Lần tải lại lỗi (quay lại tab, tải lại sau `409`) thì giữ nội dung cũ, chỉ báo lỗi kèm nút thử lại. */}
          {(contractQuery.isRefetchError || invoiceQuery.isRefetchError) && (
            <ApiErrorAlert
              error={contractQuery.error ?? invoiceQuery.error}
              onRetry={() => {
                void contractQuery.refetch()
                void invoiceQuery.refetch()
              }}
            />
          )}
          <SettlementContent contract={contractQuery.data} invoice={hasInvoice ? (invoiceQuery.data ?? null) : null} />
        </>
      )}
    </section>
  )
}

type SettlementDialog = 'send' | 'finalize' | 'complete'

function SettlementContent({ contract, invoice }: { contract: ContractDetail; invoice: InvoiceDetail | null }) {
  const [openDialog, setOpenDialog] = useState<SettlementDialog | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  // Mốc tự chốt không phụ thuộc thời điểm hiện tại; trang đang mở qua mốc thì vẽ lại để hiện nút Tự chốt.
  const now = useNowUntil(getSettlementActions(contract.status, invoice, new Date()).finalizeAllowedAfter)
  const actions = getSettlementActions(contract.status, invoice, now)
  const editing = isEditing && actions.canEdit

  const dialogProps = (dialog: SettlementDialog) => ({
    contract,
    open: openDialog === dialog,
    onOpenChange: (open: boolean) => setOpenDialog(open ? dialog : null),
  })

  const buttons: ReactNode[] = []
  if (actions.canSend && !editing) {
    buttons.push(
      <Button key="send" type="button" size="page" onClick={() => setOpenDialog('send')}>
        <Send />
        Gửi cho người thuê
      </Button>,
    )
  }
  if (actions.canEdit && !editing) {
    buttons.push(
      <Button key="edit" type="button" variant="outline" size="page" onClick={() => setIsEditing(true)}>
        <Pencil />
        Sửa
      </Button>,
    )
  }
  if (actions.canFinalize) {
    buttons.push(
      <Button key="finalize" type="button" size="page" onClick={() => setOpenDialog('finalize')}>
        <Lock />
        Tự chốt
      </Button>,
    )
  }
  if (actions.canComplete && invoice) {
    buttons.push(
      <Button key="complete" type="button" size="page" onClick={() => setOpenDialog('complete')}>
        <CircleCheckBig />
        Hoàn tất thanh lý
      </Button>,
    )
  }

  return (
    <>
      <PageHeader
        title={`Thanh lý phòng ${contract.room.code}`}
        description={`${contract.room.propertyName} · Người thuê: ${contract.tenant.fullName}`}
        action={buttons.length > 0 && <div className="flex flex-col flex-wrap gap-2 md:flex-row">{buttons}</div>}
      />

      {/* Hộp thoại nằm ngoài nút mở nó để không bị gỡ theo nút khi server trả `409` và trang tải lại sang trạng
          thái mới (người thuê vừa đồng ý, yêu cầu sửa): vẫn mở và hiện `detail`. */}
      <SendDialog {...dialogProps('send')} />
      <FinalizeDialog {...dialogProps('finalize')} />
      {invoice && <CompleteDialog {...dialogProps('complete')} invoice={invoice} needsRefund={actions.needsRefund} />}

      {invoice === null ? (
        actions.canCreate ? (
          <CreateSection contract={contract} />
        ) : (
          <Alert>
            <AlertTitle>Chưa có bảng thanh lý</AlertTitle>
            <AlertDescription>
              <p>
                Bảng thanh lý chỉ lập được khi hợp đồng đang thanh lý — sau khi một bên gửi thông báo trả phòng. Gửi
                thông báo ở trang chi tiết hợp đồng.
              </p>
            </AlertDescription>
          </Alert>
        )
      ) : editing ? (
        <EditSection contract={contract} invoice={invoice} onDone={() => setIsEditing(false)} />
      ) : (
        <>
          <SettlementStatusNotice contract={contract} invoice={invoice} actions={actions} />
          <SettlementInvoiceSummary invoice={invoice} invoicePath={(invoiceId) => `/landlord/invoices/${invoiceId}`} />
        </>
      )}
    </>
  )
}

/**
 * Thời điểm hiện tại, vẽ lại đúng lúc qua mốc `deadline` để nút Tự chốt hiện ra khi trang đang mở.
 * Mốc quá xa (hơn 24 ngày) vượt giới hạn của `setTimeout` thì không hẹn; bảng chỉ chờ tối đa 7 ngày.
 */
function useNowUntil(deadline: Date | null): Date {
  const [now, setNow] = useState(() => new Date())
  const deadlineMs = deadline?.getTime() ?? null
  useEffect(() => {
    if (deadlineMs === null) return
    const msUntil = deadlineMs - Date.now()
    if (msUntil < 0 || msUntil > 2_000_000_000) return
    // Thêm 1 ms vì đúng mốc thì chưa tự chốt được (`getSettlementActions`).
    const timer = setTimeout(() => setNow(new Date()), msUntil + 1)
    return () => clearTimeout(timer)
  }, [deadlineMs])
  return now
}

/** Hóa đơn định kỳ chưa hủy của hợp đồng, để dòng điều chỉnh chọn hóa đơn gốc. */
function useRelatedInvoices(contractId: number) {
  const invoicesQuery = useContractInvoices(contractId, true)
  return (invoicesQuery.data ?? []).filter((item) => item.type === 'DinhKy' && item.status !== 'DaHuy')
}

function CreateSection({ contract }: { contract: ContractDetail }) {
  const queryClient = useQueryClient()
  const today = getVietnamToday()
  const readingQuery = useLatestContractMeterReading(contract.id, true)
  const relatedInvoices = useRelatedInvoices(contract.id)
  const mutation = useSettlementMutation(
    (request: SettlementInvoiceRequest) => createSettlementInvoice(contract.id, request),
    {
      // Đặt sẵn bảng vừa tạo và mã bảng của hợp đồng để trang chuyển sang bảng nháp ngay, không chờ hợp đồng tải
      // lại: trong lúc chờ, form lập còn hiện (chỉ số cũ đã đổi theo bảng mới) và bấm lưu lần nữa sẽ nhận `409`.
      onSuccess: (created) => {
        queryClient.setQueryData(invoiceQueryKey(created.id), created)
        queryClient.setQueryData<ContractDetail>(contractQueryKey(contract.id), (current) =>
          current ? { ...current, settlementInvoiceId: created.id } : current,
        )
        toast.success('Đã lưu bảng thanh lý nháp')
      },
    },
  )

  return (
    <>
      <Alert>
        <AlertTitle>Lập bảng thanh lý</AlertTitle>
        <AlertDescription>
          <p>
            Chốt chỉ số điện nước lần cuối, ghi các khoản hư hỏng hoặc điều chỉnh rồi bấm Lưu nháp. Hệ thống tính tiền
            kỳ cuối, cộng công nợ và trừ tiền cọc; người thuê chỉ thấy bảng sau khi bạn bấm Gửi cho người thuê.
          </p>
          {contract.moveOutNotice && (
            <p>Ngày trả phòng dự kiến trong thông báo: {formatDate(contract.moveOutNotice.expectedMoveOutDate)}.</p>
          )}
        </AlertDescription>
      </Alert>
      <ApiErrorAlert error={readingQuery.error} onRetry={() => void readingQuery.refetch()} />
      <SettlementInvoiceForm
        defaultValues={getNewSettlementFormValues(contract.moveOutNotice?.expectedMoveOutDate ?? null, today)}
        previousReading={readingQuery.data ?? null}
        contractStartDate={contract.startDate}
        depositAmount={contract.depositAmount}
        penaltyAllowed={contract.moveOutNotice?.penaltyAllowed ?? false}
        relatedInvoices={relatedInvoices}
        systemLines={[]}
        today={today}
        submitLabel="Lưu nháp"
        isPending={mutation.isPending}
        error={mutation.error}
        onSubmit={(request) => mutation.mutate(request)}
      />
    </>
  )
}

function EditSection({
  contract,
  invoice,
  onDone,
}: {
  contract: ContractDetail
  invoice: InvoiceDetail
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const relatedInvoices = useRelatedInvoices(contract.id)
  const mutation = useSettlementMutation(
    (request: SettlementInvoiceRequest) => updateSettlementInvoice(contract.id, request),
    {
      onSuccess: (updated) => {
        queryClient.setQueryData(invoiceQueryKey(updated.id), updated)
        onDone()
        toast.success('Đã lưu bảng thanh lý')
      },
    },
  )

  return (
    <>
      {invoice.changeRequestReason && <ChangeRequestAlert reason={invoice.changeRequestReason} />}
      <SettlementInvoiceForm
        defaultValues={getSettlementFormValues(invoice)}
        previousReading={{ electricityIndex: invoice.previousElectricityIndex, waterIndex: invoice.previousWaterIndex }}
        contractStartDate={contract.startDate}
        depositAmount={contract.depositAmount}
        penaltyAllowed={contract.moveOutNotice?.penaltyAllowed ?? false}
        relatedInvoices={relatedInvoices}
        systemLines={invoice.lines.filter((line) => !isSettlementLineCategory(line.category))}
        today={getVietnamToday()}
        submitLabel="Lưu thay đổi"
        isPending={mutation.isPending}
        error={mutation.error}
        onSubmit={(request) => mutation.mutate(request)}
        onCancel={onDone}
      />
    </>
  )
}

function ChangeRequestAlert({ reason }: { reason: string }) {
  return (
    <Alert className="border-warning/40">
      <TriangleAlert />
      <AlertTitle>Người thuê chưa đồng ý bảng thanh lý</AlertTitle>
      <AlertDescription>
        <p className="whitespace-pre-line wrap-anywhere">Lý do: {reason}</p>
        <p>Sửa bảng theo góp ý rồi gửi lại; mốc 7 ngày tự chốt tính lại từ lần gửi mới.</p>
      </AlertDescription>
    </Alert>
  )
}

interface SettlementStatusNoticeProps {
  contract: ContractDetail
  invoice: InvoiceDetail
  actions: SettlementActions
}

/** Khối đầu trang nói rõ bảng đang ở đâu và Chủ trọ cần làm gì tiếp, theo bảng L9. */
function SettlementStatusNotice({ contract, invoice, actions }: SettlementStatusNoticeProps) {
  if (contract.status === 'DaThanhLy') {
    const refund = contract.depositRefund
    return (
      <Alert className="border-success/40">
        <CircleCheckBig />
        <AlertTitle>Đã hoàn tất thanh lý</AlertTitle>
        <AlertDescription>
          <p>
            {contract.terminatedAt
              ? `Hoàn tất ngày ${formatDate(contract.terminatedAt)}; hợp đồng đã đóng.`
              : 'Hợp đồng đã đóng.'}
            {invoice.totalAmount > 0 &&
              invoice.status !== 'DaThanhToan' &&
              ' Phần người thuê chưa trả vẫn giữ trên hóa đơn thanh lý; xác nhận tiền người thuê chuyển ở trang Hóa đơn.'}
          </p>
          {refund && (
            <p>
              Đã hoàn cọc <MoneyText amount={refund.amount} /> ngày {formatDate(refund.refundedAt)} ·{' '}
              {getPaymentMethodLabel(refund.method)}.
            </p>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  if (invoice.status === 'Nhap') {
    if (invoice.changeRequestReason) {
      return <ChangeRequestAlert reason={invoice.changeRequestReason} />
    }
    return (
      <Alert>
        <AlertTitle>Bảng thanh lý nháp</AlertTitle>
        <AlertDescription>
          <p>Người thuê chưa thấy bảng. Kiểm tra số tiền hệ thống tính, sửa nếu cần rồi bấm Gửi cho người thuê.</p>
        </AlertDescription>
      </Alert>
    )
  }

  if (invoice.status === 'ChoNguoiThueXacNhan') {
    return (
      <Alert>
        <AlertTitle>Đã gửi, chờ người thuê xác nhận</AlertTitle>
        <AlertDescription>
          {invoice.sentAt && <p>Gửi lúc {formatDateTime(invoice.sentAt)}.</p>}
          <p>
            {actions.canFinalize
              ? 'Đã quá 7 ngày người thuê không phản hồi: bạn được tự chốt bảng, kèm ghi chú.'
              : actions.finalizeAllowedAfter
                ? `Người thuê đồng ý hoặc yêu cầu sửa. Không phản hồi thì sau ${formatDateTime(actions.finalizeAllowedAfter.toISOString())} bạn được tự chốt bảng.`
                : 'Người thuê đồng ý hoặc yêu cầu sửa.'}
          </p>
        </AlertDescription>
      </Alert>
    )
  }

  // Đã khóa, hợp đồng còn đang thanh lý.
  const lockedBy = invoice.landlordFinalizeNote ? (
    <p className="whitespace-pre-line wrap-anywhere">Bạn đã tự chốt bảng. Ghi chú: {invoice.landlordFinalizeNote}</p>
  ) : invoice.tenantConfirmedAt ? (
    <p>Người thuê đồng ý lúc {formatDateTime(invoice.tenantConfirmedAt)}.</p>
  ) : null

  return (
    <Alert className="border-success/40">
      <Lock />
      <AlertTitle>Bảng thanh lý đã khóa</AlertTitle>
      <AlertDescription>
        {lockedBy}
        <p>{lockedNextStep(invoice)}</p>
      </AlertDescription>
    </Alert>
  )
}

function lockedNextStep(invoice: InvoiceDetail): string {
  if (invoice.status === 'ChoHoanCoc') {
    return 'Bạn phải hoàn lại phần cọc dư cho người thuê. Hoàn xong thì bấm Hoàn tất thanh lý và ghi ngày, hình thức hoàn.'
  }
  if (invoice.status === 'DaThanhToan') {
    return 'Hai bên không còn khoản nào phải trả. Bấm Hoàn tất thanh lý để đóng hợp đồng và chuyển phòng.'
  }
  return 'Người thuê thanh toán số dư như hóa đơn thường; xác nhận tiền ở trang Hóa đơn. Chưa trả đủ vẫn hoàn tất được — phần còn thiếu giữ trên hóa đơn thanh lý như một khoản nợ.'
}

interface SettlementDialogProps {
  contract: ContractDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Gửi cho người thuê (FR-57): bảng sang chờ người thuê xác nhận, ghi lần gửi; người thuê nhận thông báo. */
function SendDialog({ contract, open, onOpenChange }: SettlementDialogProps) {
  const mutation = useSettlementMutation(() => sendSettlementInvoice(contract.id))

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Gửi bảng thanh lý cho người thuê"
      description={`${contract.tenant.fullName} nhận thông báo để kiểm tra, đồng ý hoặc yêu cầu sửa. Sau khi gửi không sửa được nữa, trừ khi người thuê yêu cầu sửa. Người thuê không phản hồi trong 7 ngày thì bạn được tự chốt.`}
      confirmLabel="Gửi"
      isPending={mutation.isPending}
      error={mutation.error}
      onConfirm={() =>
        mutation.mutate(undefined, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã gửi bảng thanh lý cho người thuê')
          },
        })
      }
    />
  )
}

/** Tự chốt (FR-95): khóa bảng như người thuê đồng ý; ghi chú bắt buộc, ghi nhật ký, người thuê nhận thông báo. */
function FinalizeDialog({ contract, open, onOpenChange }: SettlementDialogProps) {
  const mutation = useSettlementMutation((note: string) => finalizeSettlementInvoice(contract.id, { note }))

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Tự chốt bảng thanh lý"
      description={`Bảng bị khóa như khi ${contract.tenant.fullName} đồng ý và không sửa được nữa. Thao tác được ghi nhật ký, người thuê nhận thông báo kèm ghi chú của bạn.`}
      reason={{
        label: 'Ghi chú',
        required: true,
        maxLength: 500,
        placeholder: 'Ví dụ: Đã gọi điện nhắc hai lần, người thuê không phản hồi',
      }}
      confirmLabel="Tự chốt"
      isPending={mutation.isPending}
      error={mutation.error}
      onConfirm={(note) =>
        mutation.mutate(note, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã tự chốt bảng thanh lý')
          },
        })
      }
    />
  )
}

interface CompleteDialogProps extends SettlementDialogProps {
  invoice: InvoiceDetail
  needsRefund: boolean
}

/**
 * Hoàn tất thanh lý (FR-59, FR-86, FR-96): hợp đồng đóng, phòng về Trống hoặc Bảo trì, hai bên nhận thông báo.
 * Số dư âm thì nhập ngày và hình thức hoàn cọc; số tiền hoàn do server đặt bằng số dư.
 */
function CompleteDialog({ contract, invoice, needsRefund, open, onOpenChange }: CompleteDialogProps) {
  const mutation = useSettlementMutation((request: CompleteSettlementRequest) =>
    completeSettlement(contract.id, request),
  )

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} isPending={mutation.isPending}>
      <CompleteBody
        contract={contract}
        invoice={invoice}
        needsRefund={needsRefund}
        isPending={mutation.isPending}
        error={mutation.error}
        onSubmit={(request) =>
          mutation.mutate(request, {
            onSuccess: () => {
              onOpenChange(false)
              toast.success('Đã hoàn tất thanh lý hợp đồng')
            },
          })
        }
      />
    </FormDialog>
  )
}

interface CompleteBodyProps {
  contract: ContractDetail
  invoice: InvoiceDetail
  needsRefund: boolean
  isPending: boolean
  error: unknown
  onSubmit: (request: CompleteSettlementRequest) => void
}

function CompleteBody({ contract, invoice, needsRefund, isPending, error, onSubmit }: CompleteBodyProps) {
  const [roomNextStatus, setRoomNextStatus] = useState<RoomNextStatus | ''>('')
  const [refundedAt, setRefundedAt] = useState(() => toVietnamDateTimeInput(new Date()))
  const [method, setMethod] = useState<PaymentMethod | ''>('')
  const [showErrors, setShowErrors] = useState(false)
  const baseId = useId()

  // `refundedAt` không trước 0 giờ ngày trả phòng thực tế (ngày cuối kỳ) và không sau hiện tại (API mục 10).
  const earliestRefund = `${invoice.periodEnd}T00:00`
  const latestRefund = toVietnamDateTimeInput(new Date())
  const roomError = roomNextStatus === '' ? 'Vui lòng chọn trạng thái phòng.' : null
  const refundedAtError = !needsRefund
    ? null
    : vietnamDateTimeInputToIso(refundedAt) === null
      ? 'Vui lòng chọn thời điểm hoàn cọc.'
      : refundedAt > latestRefund
        ? 'Không được sau thời điểm hiện tại.'
        : refundedAt < earliestRefund
          ? `Không được trước ngày trả phòng ${formatDate(invoice.periodEnd)}.`
          : null
  const methodError = needsRefund && method === '' ? 'Vui lòng chọn hình thức.' : null
  const unpaid = invoice.totalAmount > 0 && invoice.status !== 'DaThanhToan'

  return (
    <FormDialogBody
      title="Hoàn tất thanh lý"
      description={`Hợp đồng phòng ${contract.room.code} chuyển sang Đã thanh lý và không mở lại được; hai bên nhận thông báo.`}
      confirmLabel="Hoàn tất"
      isPending={isPending}
      error={error}
      validate={() => {
        setShowErrors(true)
        return roomError === null && refundedAtError === null && methodError === null
      }}
      onSubmit={() =>
        onSubmit({
          roomNextStatus: roomNextStatus as RoomNextStatus,
          refundedAt: needsRefund ? vietnamDateTimeInputToIso(refundedAt) : null,
          refundMethod: needsRefund ? (method as PaymentMethod) : null,
        })
      }
    >
      {needsRefund && (
        <p className="text-sm">
          Số tiền hoàn cho người thuê: <MoneyText amount={-invoice.totalAmount} className="font-medium" /> — đúng số dư
          của bảng.
        </p>
      )}
      {unpaid && (
        <Alert className="border-warning/40">
          <TriangleAlert />
          <AlertTitle>Người thuê chưa trả đủ</AlertTitle>
          <AlertDescription>
            Đã thu <MoneyText amount={invoice.paidAmount} /> trên <MoneyText amount={invoice.totalAmount} />. Phần còn
            thiếu giữ trên hóa đơn thanh lý; người thuê vẫn báo thanh toán được sau khi hoàn tất.
          </AlertDescription>
        </Alert>
      )}

      <Field data-invalid={showErrors && roomError !== null}>
        <FieldLabel htmlFor={`${baseId}-room`}>
          Phòng sau thanh lý <span aria-hidden="true">*</span>
        </FieldLabel>
        <NativeSelect
          id={`${baseId}-room`}
          className="w-full"
          value={roomNextStatus}
          onChange={(event) => setRoomNextStatus(event.target.value as RoomNextStatus | '')}
          disabled={isPending}
          aria-invalid={showErrors && roomError !== null}
        >
          <NativeSelectOption value="">Chọn trạng thái</NativeSelectOption>
          {ROOM_NEXT_STATUSES.map((status) => (
            <NativeSelectOption key={status} value={status}>
              {getStatusDisplay('roomOccupancy', status).label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldDescription>Chọn Bảo trì nếu cần sửa chữa trước khi cho thuê lại.</FieldDescription>
        {showErrors && roomError && <FieldError>{roomError}</FieldError>}
      </Field>

      {needsRefund && (
        <>
          <Field data-invalid={showErrors && refundedAtError !== null}>
            <FieldLabel htmlFor={`${baseId}-time`}>
              Thời điểm hoàn cọc <span aria-hidden="true">*</span>
            </FieldLabel>
            <Input
              id={`${baseId}-time`}
              type="datetime-local"
              value={refundedAt}
              min={earliestRefund}
              max={latestRefund}
              onChange={(event) => setRefundedAt(event.target.value)}
              disabled={isPending}
              aria-invalid={showErrors && refundedAtError !== null}
            />
            {showErrors && refundedAtError && <FieldError>{refundedAtError}</FieldError>}
          </Field>
          <Field data-invalid={showErrors && methodError !== null}>
            <FieldLabel htmlFor={`${baseId}-method`}>
              Hình thức <span aria-hidden="true">*</span>
            </FieldLabel>
            <NativeSelect
              id={`${baseId}-method`}
              className="w-full"
              value={method}
              onChange={(event) => setMethod(event.target.value as PaymentMethod | '')}
              disabled={isPending}
              aria-invalid={showErrors && methodError !== null}
            >
              <NativeSelectOption value="">Chọn hình thức</NativeSelectOption>
              {PAYMENT_METHODS.map((item) => (
                <NativeSelectOption key={item} value={item}>
                  {getPaymentMethodLabel(item)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {showErrors && methodError && <FieldError>{methodError}</FieldError>}
          </Field>
        </>
      )}
    </FormDialogBody>
  )
}

function SettlementSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Đang tải">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-48 max-w-full" />
      </div>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}
