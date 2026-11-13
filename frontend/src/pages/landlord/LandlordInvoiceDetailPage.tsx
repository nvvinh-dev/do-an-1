import { Ban, Check, ChevronLeft, FileSpreadsheet, Pencil, Send, X } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import ConfirmDialog from '@/components/ConfirmDialog'
import FormDialog, { FormDialogBody } from '@/components/FormDialog'
import InvoiceBreakdown from '@/components/InvoiceBreakdown'
import MoneyText from '@/components/MoneyText'
import PageHeader from '@/components/PageHeader'
import PaymentAmountField from '@/components/PaymentAmountField'
import PaymentReportList from '@/components/PaymentReportList'
import SettlementInvoiceSummary from '@/components/SettlementInvoiceSummary'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useContract } from '@/hooks/useContract'
import { useContractInvoices } from '@/hooks/useContractInvoices'
import { useInvoice } from '@/hooks/useInvoice'
import { useInvoiceMutation } from '@/hooks/useInvoiceMutation'
import { isNotFoundError } from '@/lib/apiError'
import NotFoundPage from '@/pages/public/NotFoundPage'
import { cancelInvoice, confirmPayment, issueInvoice, rejectPayment } from '@/services/invoiceService'
import type { ContractDetail } from '@/types/contractTypes'
import type { InvoiceDetail, PaymentReport } from '@/types/invoiceTypes'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { getLandlordInvoiceActions } from '@/utils/getInvoiceActions'
import { getLatestPeriodicInvoiceId, validatePaymentAmount } from '@/utils/invoiceForm'
import { getInvoiceTypeLabel } from '@/utils/invoiceTypeLabels'
import { normalizeRoomMoney } from '@/utils/validateRoomInput'

/** `state` mà liên kết ở trang danh sách gửi kèm: query lọc và trang đang xem, để nút quay lại giữ nguyên. */
interface InvoiceDetailLocationState {
  listSearch?: string
}

/**
 * L8 — Chi tiết hóa đơn ở góc nhìn Chủ trọ (docs/frontend-screens.md mục 6). Nút theo bảng "L8 — thao tác theo
 * trạng thái" (`getLandlordInvoiceActions`): nháp → sửa (→ L7), phát hành, hủy; đã phát hành chưa thu đồng nào →
 * sửa, hủy nếu là hóa đơn định kỳ mới nhất; lượt báo đang chờ → xác nhận số tiền thực thu, từ chối kèm lý do; hóa
 * đơn thanh lý → mở bảng thanh lý (L9). Mọi trạng thái hiện cách tính và lịch sử báo thanh toán như T5.
 */
export default function LandlordInvoiceDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  // Mở thẳng từ thông báo, L1, L6 thì không có `state`: quay về danh sách không lọc.
  const listSearch = (location.state as InvoiceDetailLocationState | null)?.listSearch ?? ''
  // Id không phải số thì server trả 404 như hóa đơn không thuộc mình.
  const invoiceQuery = useInvoice(Number(id))

  if (isNotFoundError(invoiceQuery.error)) {
    return <NotFoundPage />
  }

  return (
    <section className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link to={{ pathname: '/landlord/invoices', search: listSearch }}>
          <ChevronLeft />
          Hóa đơn
        </Link>
      </Button>

      {invoiceQuery.isPending ? (
        <InvoiceDetailSkeleton />
      ) : invoiceQuery.isLoadingError ? (
        <ApiErrorAlert error={invoiceQuery.error} onRetry={() => void invoiceQuery.refetch()} />
      ) : (
        <>
          {/* Lần tải lại lỗi (quay lại tab, tải lại sau `409`) thì giữ nội dung cũ và hộp thoại đang mở. */}
          {invoiceQuery.isRefetchError && (
            <ApiErrorAlert error={invoiceQuery.error} onRetry={() => void invoiceQuery.refetch()} />
          )}
          <InvoiceDetailContent invoice={invoiceQuery.data} />
        </>
      )}
    </section>
  )
}

type InvoiceDialog = 'issue' | 'cancel' | 'confirmPayment' | 'rejectPayment'

function InvoiceDetailContent({ invoice }: { invoice: InvoiceDetail }) {
  const [openDialog, setOpenDialog] = useState<InvoiceDialog | null>(null)
  const contractQuery = useContract(invoice.contractId)
  // Sửa, hủy hóa đơn đã phát hành chỉ với hóa đơn định kỳ mới nhất của hợp đồng: cần danh sách hóa đơn của nó.
  const needsLatest = invoice.type === 'DinhKy' && (invoice.status === 'ChuaThanhToan' || invoice.status === 'QuaHan')
  const invoicesQuery = useContractInvoices(invoice.contractId, needsLatest)
  const latestPeriodicInvoiceId = invoicesQuery.data ? getLatestPeriodicInvoiceId(invoicesQuery.data) : null
  const actions = getLandlordInvoiceActions(invoice, latestPeriodicInvoiceId)
  const contract = contractQuery.data

  const dialogProps = (dialog: InvoiceDialog) => ({
    invoice,
    open: openDialog === dialog,
    onOpenChange: (open: boolean) => setOpenDialog(open ? dialog : null),
  })

  const paymentReports = (
    <PaymentReportList
      reports={invoice.paymentReports}
      renderPendingActions={() => (
        <div className="flex flex-col gap-2 md:flex-row">
          <Button type="button" onClick={() => setOpenDialog('confirmPayment')}>
            <Check />
            Xác nhận đã thu
          </Button>
          <Button type="button" variant="outline" onClick={() => setOpenDialog('rejectPayment')}>
            <X />
            Từ chối
          </Button>
        </div>
      )}
    />
  )

  const buttons: ReactNode[] = []
  if (actions.canIssue) {
    buttons.push(
      <Button key="issue" type="button" size="page" onClick={() => setOpenDialog('issue')}>
        <Send />
        Phát hành
      </Button>,
    )
  }
  if (actions.canEdit) {
    buttons.push(
      <Button key="edit" asChild size="page" variant="outline">
        <Link to={`/landlord/invoices/${invoice.id}/edit`}>
          <Pencil />
          Sửa
        </Link>
      </Button>,
    )
  }
  if (actions.canCancel) {
    buttons.push(
      <Button key="cancel" type="button" variant="destructive" size="page" onClick={() => setOpenDialog('cancel')}>
        <Ban />
        Hủy hóa đơn
      </Button>,
    )
  }
  if (actions.isSettlement) {
    buttons.push(
      <Button key="settlement" asChild size="page" variant="outline">
        <Link to={`/landlord/contracts/${invoice.contractId}/settlement`}>
          <FileSpreadsheet />
          Mở bảng thanh lý
        </Link>
      </Button>,
    )
  }

  return (
    <>
      <PageHeader
        title={contract ? `Hóa đơn phòng ${contract.room.code}` : `Hóa đơn #${invoice.id}`}
        description={
          contract
            ? `${getInvoiceTypeLabel(invoice.type)} · ${contract.room.propertyName} · Người thuê: ${contract.tenant.fullName}`
            : getInvoiceTypeLabel(invoice.type)
        }
        action={buttons.length > 0 && <div className="flex flex-col flex-wrap gap-2 md:flex-row">{buttons}</div>}
      />

      <Link
        to={`/landlord/contracts/${invoice.contractId}`}
        className="-mt-3 self-start text-sm underline underline-offset-4"
      >
        Xem hợp đồng
      </Link>

      {/* Hộp thoại nằm ngoài nút mở nó để không bị gỡ theo nút khi server trả `409` và trang tải lại sang trạng thái
          mới (người thuê vừa báo thanh toán, hóa đơn mới hơn vừa lập): vẫn mở và hiện `detail`. */}
      <IssueDialog {...dialogProps('issue')} contract={contract} />
      <CancelInvoiceDialog {...dialogProps('cancel')} />
      {actions.pendingReport && (
        <>
          <ConfirmPaymentDialog {...dialogProps('confirmPayment')} report={actions.pendingReport} />
          <RejectPaymentDialog {...dialogProps('rejectPayment')} report={actions.pendingReport} />
        </>
      )}

      <InvoiceStatusNotice invoice={invoice} hasPendingReport={actions.pendingReport !== null} />

      {/* Có lượt báo đang chờ thì đưa lịch sử báo lên trước cách tính: trên điện thoại khỏi cuộn qua cả bảng mới
          tới nút Xác nhận, Từ chối. */}
      {actions.pendingReport !== null && paymentReports}

      {invoice.type === 'ThanhLy' ? (
        <SettlementInvoiceSummary invoice={invoice} invoicePath={(invoiceId) => `/landlord/invoices/${invoiceId}`} />
      ) : (
        <InvoiceBreakdown invoice={invoice} invoicePath={(invoiceId) => `/landlord/invoices/${invoiceId}`} />
      )}

      {actions.pendingReport === null && paymentReports}
    </>
  )
}

/** Khối đầu trang nói rõ hóa đơn đang ở đâu và Chủ trọ cần làm gì tiếp. */
function InvoiceStatusNotice({ invoice, hasPendingReport }: { invoice: InvoiceDetail; hasPendingReport: boolean }) {
  if (hasPendingReport) {
    return (
      <Alert className="border-warning/40">
        <AlertTitle>Người thuê báo đã thanh toán</AlertTitle>
        <AlertDescription>
          <p>
            Đối chiếu ảnh minh chứng với tài khoản nhận tiền, rồi xác nhận số tiền thực thu hoặc từ chối kèm lý do ngay
            bên dưới.
          </p>
        </AlertDescription>
      </Alert>
    )
  }

  if (invoice.type === 'DinhKy' && invoice.status === 'Nhap') {
    return (
      <Alert>
        <AlertTitle>Hóa đơn nháp</AlertTitle>
        <AlertDescription>
          <p>
            Người thuê chưa thấy hóa đơn. Kiểm tra tổng tiền và cách tính hệ thống trả về, sửa nếu cần rồi bấm Phát
            hành.
          </p>
        </AlertDescription>
      </Alert>
    )
  }

  if (invoice.status === 'DaChuyenThanhLy') {
    return (
      <Alert>
        <AlertTitle>Đã chuyển vào bảng thanh lý</AlertTitle>
        <AlertDescription>
          <p>
            Phần người thuê còn thiếu của hóa đơn này đã thành một dòng công nợ trong bảng thanh lý; thu tiền theo bảng
            thanh lý.
          </p>
          <Button asChild variant="outline" className="mt-2">
            <Link to={`/landlord/contracts/${invoice.contractId}/settlement`}>Mở bảng thanh lý</Link>
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return null
}

interface InvoiceDialogProps {
  invoice: InvoiceDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Phát hành: người thuê thấy hóa đơn và nhận thông báo; hạn thanh toán tính từ hôm nay. */
function IssueDialog({ invoice, contract, open, onOpenChange }: InvoiceDialogProps & { contract?: ContractDetail }) {
  const mutation = useInvoiceMutation(() => issueInvoice(invoice.id))
  const dueNote = contract
    ? `Hạn thanh toán là hôm nay cộng ${contract.paymentDueDays} ngày theo hợp đồng.`
    : 'Hạn thanh toán tính từ hôm nay theo số ngày trong hợp đồng.'

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Phát hành hóa đơn"
      description={`Hóa đơn ${formatCurrency(invoice.totalAmount)} kỳ ${formatDate(invoice.periodStart)} – ${formatDate(invoice.periodEnd)} được gửi tới người thuê kèm thông báo. ${dueNote} Sau khi phát hành chỉ sửa, hủy được khi người thuê chưa trả đồng nào.`}
      confirmLabel="Phát hành"
      isPending={mutation.isPending}
      error={mutation.error}
      onConfirm={() =>
        mutation.mutate(undefined, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã phát hành hóa đơn')
          },
        })
      }
    />
  )
}

/** Hủy: bắt buộc lý do; hóa đơn đã phát hành thì người thuê nhận thông báo, nháp thì không. */
function CancelInvoiceDialog({ invoice, open, onOpenChange }: InvoiceDialogProps) {
  const mutation = useInvoiceMutation((reason: string) => cancelInvoice(invoice.id, reason))
  const notifyNote =
    invoice.status === 'Nhap' ? 'Người thuê chưa thấy hóa đơn nháp nên không nhận thông báo.' : 'Người thuê nhận thông báo kèm lý do.'

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Hủy hóa đơn"
      description={`Hóa đơn kỳ ${formatDate(invoice.periodStart)} – ${formatDate(invoice.periodEnd)} bị hủy và không khôi phục được; muốn thu kỳ này thì lập lại hóa đơn. ${notifyNote}`}
      reason={{ label: 'Lý do hủy', required: true, maxLength: 500 }}
      confirmLabel="Hủy hóa đơn"
      destructive
      isPending={mutation.isPending}
      error={mutation.error}
      onConfirm={(reason) =>
        mutation.mutate(reason, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã hủy hóa đơn')
          },
        })
      }
    />
  )
}

/** Xác nhận đã thu (FR-46): số tiền thực thu, mặc định bằng số người thuê khai. */
function ConfirmPaymentDialog({ invoice, report, open, onOpenChange }: InvoiceDialogProps & { report: PaymentReport }) {
  const mutation = useInvoiceMutation((amount: number) => confirmPayment(invoice.id, report.id, amount))

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} isPending={mutation.isPending}>
      <ConfirmPaymentBody
        invoice={invoice}
        report={report}
        isPending={mutation.isPending}
        error={mutation.error}
        onSubmit={(amount) =>
          mutation.mutate(amount, {
            onSuccess: () => {
              onOpenChange(false)
              toast.success('Đã xác nhận thanh toán')
            },
          })
        }
      />
    </FormDialog>
  )
}

interface ConfirmPaymentBodyProps {
  invoice: InvoiceDetail
  report: PaymentReport
  isPending: boolean
  error: unknown
  onSubmit: (amount: number) => void
}

function ConfirmPaymentBody({ invoice, report, isPending, error, onSubmit }: ConfirmPaymentBodyProps) {
  const [amount, setAmount] = useState(() => String(report.reportedAmount))
  const [showErrors, setShowErrors] = useState(false)
  const amountResult = validatePaymentAmount(amount)
  const id = useId()

  return (
    <FormDialogBody
      title="Xác nhận đã thu"
      description={`Người thuê khai đã trả ${formatCurrency(report.reportedAmount)}. Nhập đúng số tiền bạn thực nhận; hệ thống cộng vào số đã thu và đổi trạng thái hóa đơn, người thuê nhận thông báo.`}
      confirmLabel="Xác nhận"
      isPending={isPending}
      error={error}
      validate={() => {
        setShowErrors(true)
        return amountResult === true
      }}
      onSubmit={() => onSubmit(Number(normalizeRoomMoney(amount)))}
    >
      <PaymentAmountField
        id={id}
        label="Số tiền thực thu (₫)"
        value={amount}
        onChange={setAmount}
        description={
          <>
            Tổng hóa đơn <MoneyText amount={invoice.totalAmount} />, đã thu trước đó{' '}
            <MoneyText amount={invoice.paidAmount} />. Không vượt phần còn phải trả.
          </>
        }
        error={showErrors && amountResult !== true ? amountResult : null}
        disabled={isPending}
      />
    </FormDialogBody>
  )
}

/** Từ chối lượt báo (FR-47): bắt buộc lý do; hóa đơn về trạng thái trước đó, người thuê nhận thông báo. */
function RejectPaymentDialog({ invoice, report, open, onOpenChange }: InvoiceDialogProps & { report: PaymentReport }) {
  const mutation = useInvoiceMutation((reason: string) => rejectPayment(invoice.id, report.id, reason))

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Từ chối lượt báo thanh toán"
      description={`Lượt báo ${formatCurrency(report.reportedAmount)} bị từ chối; hóa đơn trở lại chờ thanh toán và người thuê nhận thông báo kèm lý do để báo lại.`}
      reason={{ label: 'Lý do từ chối', required: true, maxLength: 500, placeholder: 'Ví dụ: Chưa nhận được tiền trong tài khoản' }}
      confirmLabel="Từ chối"
      destructive
      isPending={mutation.isPending}
      error={mutation.error}
      onConfirm={(reason) =>
        mutation.mutate(reason, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã từ chối lượt báo thanh toán')
          },
        })
      }
    />
  )
}

function InvoiceDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-48 max-w-full" />
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
