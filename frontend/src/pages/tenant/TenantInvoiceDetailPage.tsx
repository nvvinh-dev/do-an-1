import { ChevronLeft, HandCoins } from 'lucide-react'
import { useId, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import FormDialog, { FormDialogBody } from '@/components/FormDialog'
import ImageUploader from '@/components/ImageUploader'
import InvoiceBreakdown from '@/components/InvoiceBreakdown'
import MoneyText from '@/components/MoneyText'
import PageHeader from '@/components/PageHeader'
import PaymentAmountField from '@/components/PaymentAmountField'
import PaymentReportList from '@/components/PaymentReportList'
import SettlementReview from '@/components/SettlementReview'
import VietQrBox from '@/components/VietQrBox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { useContract } from '@/hooks/useContract'
import { useInvoice } from '@/hooks/useInvoice'
import { useInvoiceMutation } from '@/hooks/useInvoiceMutation'
import { isNotFoundError } from '@/lib/apiError'
import NotFoundPage from '@/pages/public/NotFoundPage'
import { reportPayment } from '@/services/invoiceService'
import type { UploadedImage } from '@/types/fileTypes'
import type { InvoiceDetail, PaymentReport, ReportPaymentRequest } from '@/types/invoiceTypes'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { getTenantInvoiceActions } from '@/utils/getInvoiceActions'
import { validatePaymentAmount } from '@/utils/invoiceForm'
import { getInvoiceTypeLabel } from '@/utils/invoiceTypeLabels'
import { normalizeRoomMoney } from '@/utils/validateRoomInput'

/** `state` mà liên kết ở trang danh sách gửi kèm: query lọc và trang đang xem, để nút quay lại giữ nguyên. */
interface InvoiceDetailLocationState {
  listSearch?: string
}

/**
 * T5 — Chi tiết hóa đơn ở góc nhìn Người thuê (docs/frontend-screens.md mục 5). Hóa đơn định kỳ hiện cách tính
 * (FR-44); hóa đơn thanh lý hiện `SettlementReview` (T6) để đồng ý hoặc chưa đồng ý bảng. Còn phải trả thì hiện
 * mã VietQR theo số còn phải trả do server tính (FR-78) và nút **Báo đã thanh toán** (số tiền, ảnh minh chứng);
 * đang chờ thì hiện lượt báo đó. Mọi trạng thái có lịch sử báo thanh toán.
 */
export default function TenantInvoiceDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  // Mở thẳng từ thông báo, T1, T4 thì không có `state`: quay về danh sách không lọc.
  const listSearch = (location.state as InvoiceDetailLocationState | null)?.listSearch ?? ''
  // Id không phải số, hóa đơn không thuộc mình hoặc chưa phát hành thì server trả 404.
  const invoiceQuery = useInvoice(Number(id))

  if (isNotFoundError(invoiceQuery.error)) {
    return <NotFoundPage />
  }

  return (
    <section className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link to={{ pathname: '/tenant/invoices', search: listSearch }}>
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

function InvoiceDetailContent({ invoice }: { invoice: InvoiceDetail }) {
  const [reportOpen, setReportOpen] = useState(false)
  const contractQuery = useContract(invoice.contractId)
  const actions = getTenantInvoiceActions(invoice)
  const contract = contractQuery.data

  return (
    <>
      <PageHeader
        title={contract ? `Hóa đơn phòng ${contract.room.code}` : `Hóa đơn #${invoice.id}`}
        description={
          contract
            ? `${getInvoiceTypeLabel(invoice.type)} · ${contract.room.propertyName}`
            : getInvoiceTypeLabel(invoice.type)
        }
        action={
          actions.canReportPayment && (
            <Button type="button" size="page" onClick={() => setReportOpen(true)}>
              <HandCoins />
              Báo đã thanh toán
            </Button>
          )
        }
      />

      <Link to={`/tenant/contracts/${invoice.contractId}`} className="-mt-3 self-start text-sm underline underline-offset-4">
        Xem hợp đồng
      </Link>

      {/* Hộp thoại nằm ngoài nút mở nó: server trả `409` (Chủ trọ vừa hủy, sửa hóa đơn) thì trang tải lại sang trạng
          thái mới, nút biến mất nhưng hộp thoại vẫn mở để hiện `detail`. */}
      <ReportPaymentDialog invoice={invoice} open={reportOpen} onOpenChange={setReportOpen} />

      <InvoiceStatusNotice invoice={invoice} pendingReport={actions.pendingReport} />

      {actions.canReportPayment && <PaymentSection invoice={invoice} />}

      {invoice.type === 'ThanhLy' ? (
        <SettlementReview invoice={invoice} />
      ) : (
        <InvoiceBreakdown invoice={invoice} invoicePath={(invoiceId) => `/tenant/invoices/${invoiceId}`} />
      )}

      <PaymentReportList reports={invoice.paymentReports} />
    </>
  )
}

/** Khối đầu trang nói rõ hóa đơn đang ở đâu và Người thuê cần làm gì tiếp. */
function InvoiceStatusNotice({ invoice, pendingReport }: { invoice: InvoiceDetail; pendingReport: PaymentReport | null }) {
  if (pendingReport) {
    return (
      <Alert>
        <AlertTitle>Đang chờ Chủ trọ xác nhận</AlertTitle>
        <AlertDescription>
          <p>
            Bạn đã báo trả <MoneyText amount={pendingReport.reportedAmount} />. Chủ trọ đối chiếu tài khoản rồi xác
            nhận hoặc từ chối; bạn nhận thông báo khi có kết quả.
          </p>
        </AlertDescription>
      </Alert>
    )
  }

  if (invoice.status === 'QuaHan') {
    return (
      <Alert className="border-destructive/40">
        <AlertTitle>Hóa đơn đã quá hạn</AlertTitle>
        <AlertDescription>
          <p>
            {invoice.dueDate ? `Hạn thanh toán là ${formatDate(invoice.dueDate)}. ` : ''}Chuyển khoản phần còn phải trả
            rồi bấm Báo đã thanh toán kèm ảnh minh chứng.
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
          <p>Phần còn thiếu của hóa đơn này đã thành một dòng công nợ trong bảng thanh lý của hợp đồng.</p>
        </AlertDescription>
      </Alert>
    )
  }

  if (invoice.status === 'DaHuy') {
    return (
      <Alert>
        <AlertTitle>Hóa đơn đã bị hủy</AlertTitle>
        <AlertDescription>
          <p className="whitespace-pre-line wrap-anywhere">
            {invoice.cancelReason ? `Lý do: ${invoice.cancelReason}` : 'Bạn không phải thanh toán hóa đơn này.'}
          </p>
        </AlertDescription>
      </Alert>
    )
  }

  return null
}

/**
 * Cách trả phần còn phải trả: mã VietQR do server lập theo số còn phải trả (FR-78) — `null` khi Chủ trọ chưa khai
 * báo tài khoản nhận tiền thì hướng dẫn trả trực tiếp (FR-80). Trả xong thì báo kèm minh chứng.
 */
function PaymentSection({ invoice }: { invoice: InvoiceDetail }) {
  if (invoice.paymentQr) {
    return (
      <div className="flex flex-col gap-3">
        <VietQrBox paymentQr={invoice.paymentQr} />
        <p className="text-sm text-muted-foreground">
          Chuyển khoản xong thì bấm Báo đã thanh toán và đính kèm ảnh chụp giao dịch; Chủ trọ xác nhận khi đã nhận
          tiền.
        </p>
      </div>
    )
  }

  return (
    <Alert>
      <AlertTitle>Thanh toán trực tiếp với Chủ trọ</AlertTitle>
      <AlertDescription>
        <p>
          Chủ trọ chưa khai báo tài khoản nhận tiền nên chưa có mã VietQR. Trả tiền cho Chủ trọ rồi báo đã thanh toán
          kèm ảnh minh chứng (biên nhận, ảnh chụp giao dịch).
        </p>
      </AlertDescription>
    </Alert>
  )
}

interface ReportPaymentDialogProps {
  invoice: InvoiceDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Báo đã thanh toán (FR-45, BR-06b): số tiền đã trả và ảnh minh chứng bắt buộc; hóa đơn sang chờ xác nhận. */
function ReportPaymentDialog({ invoice, open, onOpenChange }: ReportPaymentDialogProps) {
  const mutation = useInvoiceMutation((request: ReportPaymentRequest) => reportPayment(invoice.id, request))

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} isPending={mutation.isPending}>
      <ReportPaymentBody
        invoice={invoice}
        isPending={mutation.isPending}
        error={mutation.error}
        onSubmit={(request) =>
          mutation.mutate(request, {
            onSuccess: () => {
              onOpenChange(false)
              toast.success('Đã báo thanh toán, chờ Chủ trọ xác nhận')
            },
          })
        }
      />
    </FormDialog>
  )
}

interface ReportPaymentBodyProps {
  invoice: InvoiceDetail
  isPending: boolean
  error: unknown
  onSubmit: (request: ReportPaymentRequest) => void
}

function ReportPaymentBody({ invoice, isPending, error, onSubmit }: ReportPaymentBodyProps) {
  // Mặc định là số còn phải trả trên mã VietQR — số server tính, không tự trừ ở đây.
  const [amount, setAmount] = useState(() => (invoice.paymentQr ? String(invoice.paymentQr.amount) : ''))
  const [proof, setProof] = useState<UploadedImage[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const amountResult = validatePaymentAmount(amount)
  const proofError = isUploading
    ? 'Ảnh đang tải lên, chờ tải xong rồi gửi.'
    : proof.length === 0
      ? 'Vui lòng đính kèm ảnh minh chứng.'
      : null
  const amountId = useId()

  return (
    <FormDialogBody
      title="Báo đã thanh toán"
      description={`Hóa đơn ${formatCurrency(invoice.totalAmount)}, đã được xác nhận thu ${formatCurrency(invoice.paidAmount)}. Nhập số tiền bạn vừa trả và đính kèm ảnh minh chứng; Chủ trọ đối chiếu rồi xác nhận.`}
      confirmLabel="Gửi"
      isPending={isPending}
      error={error}
      validate={() => {
        setShowErrors(true)
        return amountResult === true && proofError === null
      }}
      onSubmit={() =>
        onSubmit({ reportedAmount: Number(normalizeRoomMoney(amount)), proofImagePath: proof[0]?.path ?? '' })
      }
    >
      <PaymentAmountField
        id={amountId}
        label="Số tiền đã trả (₫)"
        value={amount}
        onChange={setAmount}
        description="Trả một phần cũng được; không vượt phần còn phải trả."
        error={showErrors && amountResult !== true ? amountResult : null}
        disabled={isPending}
      />
      <Field data-invalid={showErrors && proofError !== null}>
        <FieldLabel>
          Ảnh minh chứng <span aria-hidden="true">*</span>
        </FieldLabel>
        <ImageUploader
          purpose="MinhChungThanhToan"
          value={proof}
          onChange={setProof}
          disabled={isPending}
          onUploadingChange={setIsUploading}
        />
        <FieldDescription>Ảnh chụp giao dịch chuyển khoản hoặc biên nhận tiền mặt.</FieldDescription>
        {showErrors && proofError && <FieldError>{proofError}</FieldError>}
      </Field>
    </FormDialogBody>
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
