import { CircleCheckBig, Lock, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'
import SettlementInvoiceSummary from '@/components/SettlementInvoiceSummary'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useSettlementMutation } from '@/hooks/useSettlementMutation'
import { confirmSettlementInvoice, requestSettlementChanges } from '@/services/settlementService'
import type { InvoiceDetail } from '@/types/invoiceTypes'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDateTime } from '@/utils/formatDateTime'

interface SettlementReviewProps {
  /** Hóa đơn thanh lý (`type = ThanhLy`) lấy từ `GET /invoices/{id}` của Người thuê. */
  invoice: InvoiceDetail
}

/**
 * T6 — bảng thanh lý phía Người thuê, nằm trong T5 (docs/frontend-screens.md mục 5). Hiện từng dòng và chiều
 * số dư; chỉ ở `ChoNguoiThueXacNhan` mới có **Đồng ý** (hộp thoại, FR-75) và **Chưa đồng ý** (bắt buộc lý do,
 * FR-57). Bảng đã gửi rồi quay về `Nhap` sau khi Người thuê yêu cầu sửa thì chỉ đọc, kèm lý do đã gửi: lúc
 * đó hai endpoint trả `404` cho tới khi Chủ trọ gửi lại (api-design mục 10).
 */
export default function SettlementReview({ invoice }: SettlementReviewProps) {
  const [dialog, setDialog] = useState<'confirm' | 'requestChanges' | null>(null)
  const canRespond = invoice.status === 'ChoNguoiThueXacNhan'

  return (
    <section aria-labelledby="settlement-review-title" className="flex flex-col gap-6">
      <h2 id="settlement-review-title" className="text-xl font-semibold">
        Bảng thanh lý
      </h2>

      <SettlementReviewNotice invoice={invoice} />

      <SettlementInvoiceSummary invoice={invoice} invoicePath={(invoiceId) => `/tenant/invoices/${invoiceId}`} />

      {canRespond && (
        <div className="flex flex-col gap-2 md:flex-row md:justify-end">
          <Button variant="outline" onClick={() => setDialog('requestChanges')}>
            Chưa đồng ý
          </Button>
          <Button onClick={() => setDialog('confirm')}>Đồng ý</Button>
        </div>
      )}

      {/* Hộp thoại nằm ngoài khối nút: server trả `409` (Chủ trọ vừa tự chốt) thì trang tải lại sang trạng thái
          mới, nút biến mất nhưng hộp thoại vẫn mở để hiện `detail`. */}
      <ConfirmSettlementDialog
        invoice={invoice}
        open={dialog === 'confirm'}
        onOpenChange={(open) => setDialog(open ? 'confirm' : null)}
      />
      <RequestSettlementChangesDialog
        invoice={invoice}
        open={dialog === 'requestChanges'}
        onOpenChange={(open) => setDialog(open ? 'requestChanges' : null)}
      />
    </section>
  )
}

/** Khối đầu bảng: bảng đang ở đâu và Người thuê cần làm gì tiếp. */
function SettlementReviewNotice({ invoice }: { invoice: InvoiceDetail }) {
  if (invoice.status === 'Nhap') {
    return (
      <Alert className="border-warning/40">
        <TriangleAlert />
        <AlertTitle>Đang chờ Chủ trọ sửa và gửi lại</AlertTitle>
        <AlertDescription>
          {invoice.changeRequestReason && (
            <p className="whitespace-pre-line wrap-anywhere">Lý do bạn đã gửi: {invoice.changeRequestReason}</p>
          )}
          <p>Bảng dưới đây là bản trước khi sửa, chỉ để xem. Chủ trọ gửi lại thì bạn nhận thông báo và xác nhận lại.</p>
        </AlertDescription>
      </Alert>
    )
  }

  if (invoice.status === 'ChoNguoiThueXacNhan') {
    return (
      <Alert>
        <AlertTitle>Chủ trọ đã gửi bảng thanh lý, chờ bạn xác nhận</AlertTitle>
        <AlertDescription>
          {invoice.sentAt && <p>Gửi lúc {formatDateTime(invoice.sentAt)}.</p>}
          <p>
            Kiểm tra từng khoản rồi bấm Đồng ý, hoặc Chưa đồng ý kèm lý do để Chủ trọ sửa. Quá 7 ngày kể từ lần gửi
            mà bạn không phản hồi, Chủ trọ được tự chốt bảng.
          </p>
        </AlertDescription>
      </Alert>
    )
  }

  const lockedBy = invoice.landlordFinalizeNote ? (
    <p className="whitespace-pre-line wrap-anywhere">
      Chủ trọ đã tự chốt bảng vì bạn không phản hồi sau 7 ngày. Ghi chú: {invoice.landlordFinalizeNote}
    </p>
  ) : invoice.tenantConfirmedAt ? (
    <p>Bạn đã đồng ý lúc {formatDateTime(invoice.tenantConfirmedAt)}.</p>
  ) : null

  return (
    <Alert className="border-success/40">
      {invoice.status === 'DaThanhToan' ? <CircleCheckBig /> : <Lock />}
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
    return 'Chủ trọ hoàn lại phần cọc dư cho bạn; Chủ trọ ghi nhận đã hoàn thì bạn nhận thông báo.'
  }
  if (invoice.totalAmount <= 0) {
    return 'Hai bên không còn khoản nào phải trả.'
  }
  if (invoice.status === 'DaThanhToan') {
    return 'Bạn đã thanh toán đủ số dư.'
  }
  return 'Bạn thanh toán số dư như hóa đơn thường: chuyển khoản theo mã VietQR rồi báo đã thanh toán.'
}

interface SettlementDialogProps {
  invoice: InvoiceDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Đồng ý (FR-57, FR-75): bảng bị khóa, không sửa được nữa; hậu quả nói theo chiều số dư (FR-58). */
function ConfirmSettlementDialog({ invoice, open, onOpenChange }: SettlementDialogProps) {
  const mutation = useSettlementMutation(() => confirmSettlementInvoice(invoice.contractId))

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Đồng ý bảng thanh lý"
      description={`Bạn đồng ý toàn bộ các khoản trong bảng. Bảng bị khóa và không sửa được nữa, Chủ trọ nhận thông báo. ${confirmConsequence(invoice.totalAmount)}`}
      confirmLabel="Đồng ý"
      isPending={mutation.isPending}
      error={mutation.error}
      onConfirm={() =>
        mutation.mutate(undefined, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã đồng ý bảng thanh lý')
          },
        })
      }
    />
  )
}

function confirmConsequence(totalAmount: number): string {
  if (totalAmount > 0) {
    return `Bạn còn phải trả Chủ trọ ${formatCurrency(totalAmount)}; hạn thanh toán tính từ lúc đồng ý.`
  }
  if (totalAmount < 0) {
    return `Chủ trọ phải hoàn lại cho bạn ${formatCurrency(-totalAmount)} tiền cọc dư.`
  }
  return 'Hai bên không còn khoản nào phải trả.'
}

/** Chưa đồng ý (FR-57): bắt buộc lý do; bảng về nháp, Chủ trọ nhận thông báo kèm lý do. */
function RequestSettlementChangesDialog({ invoice, open, onOpenChange }: SettlementDialogProps) {
  const mutation = useSettlementMutation((reason: string) => requestSettlementChanges(invoice.contractId, reason))

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Chưa đồng ý bảng thanh lý"
      description="Bảng quay về nháp để Chủ trọ sửa, Chủ trọ nhận thông báo kèm nội dung bạn ghi. Chủ trọ gửi lại thì bạn kiểm tra và xác nhận lại."
      reason={{
        label: 'Khoản nào chưa đúng',
        required: true,
        maxLength: 500,
        placeholder: 'Ví dụ: kính cửa sổ đã vỡ từ trước khi tôi vào ở',
      }}
      confirmLabel="Gửi yêu cầu sửa"
      isPending={mutation.isPending}
      error={mutation.error}
      onConfirm={(reason) =>
        mutation.mutate(reason, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã gửi yêu cầu sửa cho Chủ trọ')
          },
        })
      }
    />
  )
}
