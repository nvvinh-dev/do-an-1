import { ChevronLeft, CircleCheck, CircleX, FilePen, PencilLine, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import ConfirmDialog from '@/components/ConfirmDialog'
import CountdownText from '@/components/CountdownText'
import MoneyText from '@/components/MoneyText'
import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCancelContract } from '@/hooks/useCancelContract'
import { useConfirmContract } from '@/hooks/useConfirmContract'
import { useContract } from '@/hooks/useContract'
import { useRequestContractChanges } from '@/hooks/useRequestContractChanges'
import { isNotFoundError } from '@/lib/apiError'
import NotFoundPage from '@/pages/public/NotFoundPage'
import type { ContractDetail, ContractParty } from '@/types/contractTypes'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { formatMeterIndex } from '@/utils/formatMeterIndex'
import { getTenantContractActions } from '@/utils/getTenantContractActions'
import { getVietnamToday } from '@/utils/getVietnamToday'
import { getPaymentMethodLabel } from '@/utils/paymentMethodLabels'

/**
 * T4 — Chi tiết hợp đồng (docs/frontend-screens.md mục 5), phần trước khi trả phòng. Hiện theo
 * trạng thái: nháp → chỉ đọc, nút hủy; chờ người thuê xác nhận → đủ điều khoản, nút đồng ý, yêu cầu
 * sửa, hủy; chờ nhận cọc → đếm ngược hạn giữ chỗ, nút hủy; đang hiệu lực trước ngày bắt đầu → nút
 * hủy kèm cảnh báo mất cọc; đã hủy → lý do và hoàn cọc; đã thanh lý → chỉ xem. Thao tác xong thì ở
 * lại trang, hiện `toast` và tải lại dữ liệu (design-system mục 8).
 */
export default function TenantContractDetailPage() {
  const { id } = useParams()
  // Id không phải số thì server trả 404 như hợp đồng không thuộc mình.
  const contractId = Number(id)
  const contractQuery = useContract(contractId)

  if (isNotFoundError(contractQuery.error)) {
    return <NotFoundPage />
  }

  return (
    <section className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link to="/tenant/contracts">
          <ChevronLeft />
          Hợp đồng
        </Link>
      </Button>

      {contractQuery.isPending ? (
        <ContractDetailSkeleton />
      ) : contractQuery.isError ? (
        <ApiErrorAlert error={contractQuery.error} onRetry={() => void contractQuery.refetch()} />
      ) : (
        <ContractDetailContent contract={contractQuery.data} />
      )}
    </section>
  )
}

type ContractDialog = 'confirm' | 'requestChanges' | 'cancel'

function ContractDetailContent({ contract }: { contract: ContractDetail }) {
  const [openDialog, setOpenDialog] = useState<ContractDialog | null>(null)
  const today = getVietnamToday()
  const actions = getTenantContractActions(contract, today)
  const hasAction = actions.canConfirm || actions.canRequestChanges || actions.canCancel

  const dialogProps = (dialog: ContractDialog) => ({
    contract,
    open: openDialog === dialog,
    onOpenChange: (open: boolean) => setOpenDialog(open ? dialog : null),
  })

  return (
    <>
      <PageHeader
        title={`Hợp đồng phòng ${contract.room.code}`}
        description={contract.room.propertyName}
        action={
          hasAction && (
            <div className="flex flex-col gap-2 md:flex-row">
              {actions.canConfirm && (
                <Button type="button" size="page" onClick={() => setOpenDialog('confirm')}>
                  <CircleCheck />
                  Đồng ý
                </Button>
              )}
              {actions.canRequestChanges && (
                <Button type="button" variant="outline" size="page" onClick={() => setOpenDialog('requestChanges')}>
                  <PencilLine />
                  Yêu cầu sửa
                </Button>
              )}
              {actions.canCancel && (
                <Button type="button" variant="destructive" size="page" onClick={() => setOpenDialog('cancel')}>
                  <CircleX />
                  Hủy hợp đồng
                </Button>
              )}
            </div>
          )
        }
      />

      <ConfirmContractDialog {...dialogProps('confirm')} />
      <RequestContractChangesDialog {...dialogProps('requestChanges')} />
      <CancelContractDialog {...dialogProps('cancel')} />

      <ContractStatusNotice contract={contract} today={today} />

      {contract.status === 'DaHuy' && <DepositRefundSection contract={contract} />}

      <DetailCard title="Các bên">
        <dt className="text-muted-foreground">Chủ trọ</dt>
        <dd>
          <PartyText party={contract.landlord} />
        </dd>

        <dt className="text-muted-foreground">Người thuê</dt>
        <dd>
          <PartyText party={contract.tenant} />
        </dd>
      </DetailCard>

      <DetailCard title="Điều khoản">
        <dt className="text-muted-foreground">Trạng thái</dt>
        <dd>
          <StatusBadge kind="contract" status={contract.status} />
        </dd>

        <dt className="text-muted-foreground">Phòng</dt>
        <dd className="wrap-anywhere">
          Phòng {contract.room.code} · {contract.room.propertyName}
        </dd>

        <dt className="text-muted-foreground">Thời hạn</dt>
        <dd>
          {formatDate(contract.startDate)} – {formatDate(contract.endDate)}
        </dd>

        <dt className="text-muted-foreground">Giá thuê</dt>
        <dd>
          <MoneyText amount={contract.rentPrice} /> / tháng
        </dd>

        <dt className="text-muted-foreground">Tiền cọc</dt>
        <dd>{contract.depositAmount > 0 ? <MoneyText amount={contract.depositAmount} /> : 'Không đặt cọc'}</dd>

        <dt className="text-muted-foreground">Giá điện</dt>
        <dd>
          <MoneyText amount={contract.electricityUnitPrice} /> / kWh
        </dd>

        <dt className="text-muted-foreground">Giá nước</dt>
        <dd>
          <MoneyText amount={contract.waterUnitPrice} /> / m³
        </dd>

        <dt className="text-muted-foreground">Hạn thanh toán</dt>
        <dd>{contract.paymentDueDays} ngày kể từ ngày phát hành hóa đơn</dd>

        <dt className="text-muted-foreground">Chỉ số đầu</dt>
        <dd className="tabular-nums">
          Điện {formatMeterIndex(contract.initialElectricityIndex)} kWh · Nước{' '}
          {formatMeterIndex(contract.initialWaterIndex)} m³
        </dd>

        {contract.tenantConfirmedAt && (
          <>
            <dt className="text-muted-foreground">Bạn đồng ý ngày</dt>
            <dd>{formatDate(contract.tenantConfirmedAt)}</dd>
          </>
        )}

        {contract.depositReceivedAt && (
          <>
            <dt className="text-muted-foreground">Chủ trọ nhận cọc</dt>
            <dd>
              Ngày {formatDate(contract.depositReceivedAt)}
              {contract.depositReceivedMethod && ` · ${getPaymentMethodLabel(contract.depositReceivedMethod)}`}
            </dd>
          </>
        )}

        {contract.activatedAt && (
          <>
            <dt className="text-muted-foreground">Có hiệu lực ngày</dt>
            <dd>{formatDate(contract.activatedAt)}</dd>
          </>
        )}
      </DetailCard>

      {contract.serviceFees.length === 0 ? (
        <DetailCard title="Phí dịch vụ" note="Không có phí dịch vụ." />
      ) : (
        <DetailCard title="Phí dịch vụ">
          {contract.serviceFees.map((fee, index) => (
            <DetailRow key={index} term={fee.name}>
              <MoneyText amount={fee.amount} />
            </DetailRow>
          ))}
        </DetailCard>
      )}

      {contract.occupants.length === 0 ? (
        <DetailCard title="Người ở cùng" note="Không có người ở cùng." />
      ) : (
        <DetailCard title="Người ở cùng">
          {contract.occupants.map((occupant, index) => (
            <DetailRow key={index} term={occupant.fullName}>
              {occupant.phoneNumber ? (
                <PhoneLink phoneNumber={occupant.phoneNumber} />
              ) : (
                <span className="text-muted-foreground">Không có số điện thoại</span>
              )}
            </DetailRow>
          ))}
        </DetailCard>
      )}
    </>
  )
}

interface DetailCardProps {
  title: string
  /** Các cặp `dt`/`dd`, xếp hai cột từ `md`; bỏ trống khi không có dòng nào. */
  children?: ReactNode
  /** Câu ghi chú dưới các dòng, hoặc câu thay cho danh sách rỗng. */
  note?: string
}

function DetailCard({ title, children, note }: DetailCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6">
      <h2 className="text-lg font-medium">{title}</h2>
      {children && <dl className="grid gap-4 text-sm md:grid-cols-[12rem_1fr]">{children}</dl>}
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
    </div>
  )
}

function DetailRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground wrap-anywhere">{term}</dt>
      <dd>{children}</dd>
    </>
  )
}

function PhoneLink({ phoneNumber }: { phoneNumber: string }) {
  return (
    <a href={`tel:${phoneNumber}`} className="tabular-nums underline underline-offset-4">
      {phoneNumber}
    </a>
  )
}

/** Họ tên kèm số điện thoại khi server cho phép hiện (FR-74). */
function PartyText({ party }: { party: ContractParty }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="wrap-anywhere">{party.fullName}</span>
      {party.phoneNumber && <PhoneLink phoneNumber={party.phoneNumber} />}
    </span>
  )
}

/** Hạn giữ chỗ của hợp đồng chưa hiệu lực; quá hạn thì hợp đồng tự hủy (BP-06 A3). */
function HoldDeadline({ holdExpiresAt }: { holdExpiresAt: string | null }) {
  if (!holdExpiresAt) {
    return null
  }
  return (
    <p>
      Hạn giữ chỗ: <CountdownText expiresAt={holdExpiresAt} className="font-medium" />. Quá hạn mà hợp đồng chưa có
      hiệu lực thì hợp đồng tự hủy và phòng mở lại cho người khác.
    </p>
  )
}

/** Khối đầu trang nói rõ hợp đồng đang ở đâu và người thuê cần làm gì tiếp, theo bảng T4. */
function ContractStatusNotice({ contract, today }: { contract: ContractDetail; today: string }) {
  switch (contract.status) {
    case 'Nhap':
      return (
        <Alert>
          <FilePen />
          <AlertTitle>Chủ trọ đang soạn hợp đồng</AlertTitle>
          <AlertDescription>
            <p>Hợp đồng chỉ để xem. Chủ trọ gửi xong thì bạn nhận thông báo để kiểm tra và đồng ý.</p>
            <HoldDeadline holdExpiresAt={contract.holdExpiresAt} />
          </AlertDescription>
        </Alert>
      )

    case 'ChoNguoiThueXacNhan':
      return (
        <Alert className="border-warning/40">
          <AlertTitle>Chủ trọ đã gửi hợp đồng, chờ bạn xác nhận</AlertTitle>
          <AlertDescription>
            <p>
              Kiểm tra điều khoản, phí dịch vụ, người ở cùng và chỉ số đầu bên dưới. Đúng thì bấm Đồng ý; cần sửa thì
              bấm Yêu cầu sửa và ghi rõ chỗ cần sửa.
            </p>
            <HoldDeadline holdExpiresAt={contract.holdExpiresAt} />
          </AlertDescription>
        </Alert>
      )

    case 'ChoNhanCoc':
      return (
        <Alert>
          <AlertTitle>Chờ Chủ trọ xác nhận đã nhận cọc</AlertTitle>
          <AlertDescription>
            <p>
              Bạn đã đồng ý điều khoản. Chuyển tiền cọc {formatCurrency(contract.depositAmount)} cho Chủ trọ; hợp đồng có
              hiệu lực khi Chủ trọ xác nhận đã nhận đủ cọc.
            </p>
            <HoldDeadline holdExpiresAt={contract.holdExpiresAt} />
          </AlertDescription>
        </Alert>
      )

    case 'DangHieuLuc':
      // Từ ngày bắt đầu, khối thông báo trả phòng thay chỗ này (thẻ BP-10).
      if (today >= contract.startDate) {
        return null
      }
      return (
        <Alert className="border-success/40">
          <AlertTitle>Hợp đồng đã có hiệu lực</AlertTitle>
          <AlertDescription>
            <p>Bạn vào ở từ ngày {formatDate(contract.startDate)}.</p>
            {contract.depositReceivedAt && (
              <p className="flex gap-2 text-warning">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                Hủy hợp đồng trước ngày bắt đầu thì Chủ trọ được giữ lại tối đa toàn bộ tiền cọc{' '}
                {formatCurrency(contract.depositAmount)}.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )

    case 'DaHuy':
      return (
        <Alert>
          <CircleX />
          <AlertTitle>Hợp đồng đã hủy</AlertTitle>
          <AlertDescription>
            <p>{cancelledSentence(contract)}</p>
            {contract.cancelReason && <p className="whitespace-pre-line wrap-anywhere">Lý do: {contract.cancelReason}</p>}
          </AlertDescription>
        </Alert>
      )

    case 'DaThanhLy':
      return (
        <Alert>
          <AlertTitle>Hợp đồng đã thanh lý</AlertTitle>
          <AlertDescription>
            <p>
              {contract.terminatedAt
                ? `Hoàn tất thanh lý ngày ${formatDate(contract.terminatedAt)}. Hợp đồng chỉ để xem.`
                : 'Hợp đồng chỉ để xem.'}
            </p>
          </AlertDescription>
        </Alert>
      )

    // `SapHetHan`, `DangThanhLy`: thông báo trả phòng và thanh lý thuộc thẻ BP-10.
    default:
      return null
  }
}

function cancelledSentence(contract: ContractDetail): string {
  const date = contract.cancelledAt ? ` ngày ${formatDate(contract.cancelledAt)}` : ''
  switch (contract.cancelledBy) {
    case 'Tenant':
      return `Bạn đã hủy hợp đồng${date}.`
    case 'Landlord':
      return `Chủ trọ đã hủy hợp đồng${date}.`
    case 'System':
      return `Hệ thống tự hủy hợp đồng${date} vì quá hạn giữ chỗ mà hợp đồng chưa có hiệu lực.`
    default:
      return `Hợp đồng đã hủy${date}.`
  }
}

/**
 * Hoàn cọc của hợp đồng đã hủy (FR-86): đã hoàn thì hiện số tiền, ngày, hình thức và lý do giữ lại;
 * đã nhận cọc mà chưa hoàn thì hiện "Chờ hoàn cọc". Hợp đồng chưa từng nhận cọc thì không hiện.
 */
function DepositRefundSection({ contract }: { contract: ContractDetail }) {
  const refund = contract.depositRefund

  if (refund) {
    return (
      <DetailCard title="Hoàn cọc">
        <dt className="text-muted-foreground">Số tiền hoàn</dt>
        <dd>
          <MoneyText amount={refund.amount} className="font-medium" /> (tiền cọc{' '}
          <MoneyText amount={contract.depositAmount} />)
        </dd>

        <dt className="text-muted-foreground">Ngày hoàn</dt>
        <dd>{formatDate(refund.refundedAt)}</dd>

        <dt className="text-muted-foreground">Hình thức</dt>
        <dd>{getPaymentMethodLabel(refund.method)}</dd>

        {refund.note && (
          <>
            <dt className="text-muted-foreground">Lý do giữ lại</dt>
            <dd className="whitespace-pre-line wrap-anywhere">{refund.note}</dd>
          </>
        )}
      </DetailCard>
    )
  }

  if (!contract.depositRefundPending) {
    return null
  }

  return (
    <DetailCard
      title="Hoàn cọc"
      note={
        contract.cancelledBy === 'Tenant'
          ? 'Bạn là bên hủy nên Chủ trọ được giữ lại tối đa toàn bộ tiền cọc, phần giữ lại phải ghi rõ lý do. Chủ trọ ghi nhận xong thì bạn nhận thông báo.'
          : 'Bạn được hoàn toàn bộ tiền cọc. Chủ trọ ghi nhận xong thì bạn nhận thông báo.'
      }
    >
      <dt className="text-muted-foreground">Trạng thái</dt>
      <dd className="font-medium text-warning">Chờ hoàn cọc</dd>

      <dt className="text-muted-foreground">Tiền cọc đã nộp</dt>
      <dd>
        <MoneyText amount={contract.depositAmount} />
      </dd>
    </DetailCard>
  )
}

interface ContractDialogProps {
  contract: ContractDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Hộp thoại nằm ngoài nút mở nó để không bị gỡ theo nút khi server trả `409` và trang tải lại sang
// trạng thái mới (Chủ trọ vừa thu hồi, bên kia vừa hủy): vẫn mở và hiện `detail` để người dùng biết vì sao.

/** Đồng ý điều khoản: cọc > 0 thì sang chờ nhận cọc, cọc = 0 thì có hiệu lực ngay (BR-21). */
function ConfirmContractDialog({ contract, open, onOpenChange }: ContractDialogProps) {
  const confirmMutation = useConfirmContract(contract.id)

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Đồng ý hợp đồng"
      description={
        contract.depositAmount > 0
          ? `Bạn đồng ý toàn bộ điều khoản của hợp đồng phòng ${contract.room.code}. Hợp đồng chuyển sang chờ nhận cọc: bạn chuyển tiền cọc ${formatCurrency(contract.depositAmount)} cho Chủ trọ, hợp đồng có hiệu lực khi Chủ trọ xác nhận đã nhận cọc.`
          : `Bạn đồng ý toàn bộ điều khoản của hợp đồng phòng ${contract.room.code}. Hợp đồng không có tiền cọc nên có hiệu lực ngay khi bạn đồng ý.`
      }
      confirmLabel="Đồng ý"
      isPending={confirmMutation.isPending}
      error={confirmMutation.error}
      onConfirm={() =>
        confirmMutation.mutate(undefined, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã đồng ý hợp đồng')
          },
        })
      }
    />
  )
}

/** Yêu cầu sửa (FR-84): bắt buộc lý do; hợp đồng về nháp, Chủ trọ nhận thông báo kèm lý do. */
function RequestContractChangesDialog({ contract, open, onOpenChange }: ContractDialogProps) {
  const requestChangesMutation = useRequestContractChanges(contract.id)

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Yêu cầu sửa hợp đồng"
      description="Hợp đồng quay về nháp để Chủ trọ sửa, Chủ trọ nhận thông báo kèm nội dung bạn ghi. Chủ trọ gửi lại thì bạn kiểm tra và xác nhận lại."
      reason={{
        label: 'Cần sửa gì',
        required: true,
        placeholder: 'Ví dụ: giá điện đã thống nhất là 3.500 ₫ / kWh',
      }}
      confirmLabel="Gửi yêu cầu sửa"
      isPending={requestChangesMutation.isPending}
      error={requestChangesMutation.error}
      onConfirm={(reason) =>
        requestChangesMutation.mutate(reason, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã gửi yêu cầu sửa cho Chủ trọ')
          },
        })
      }
    />
  )
}

/**
 * Hủy trước ngày bắt đầu (FR-75, FR-76): bắt buộc lý do. Hợp đồng đã hiệu lực và đã nhận cọc thì
 * cảnh báo Chủ trọ được giữ lại tới toàn bộ cọc (BR-22).
 */
function CancelContractDialog({ contract, open, onOpenChange }: ContractDialogProps) {
  const cancelMutation = useCancelContract(contract.id)
  const consequence = `Phòng ${contract.room.code} sẽ mở lại cho người khác thuê, Chủ trọ nhận thông báo. Hợp đồng đã hủy không khôi phục được.`

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Hủy hợp đồng"
      description={
        contract.status === 'DangHieuLuc' && contract.depositReceivedAt
          ? `Hợp đồng đã có hiệu lực. Bạn hủy thì Chủ trọ được giữ lại tối đa toàn bộ tiền cọc ${formatCurrency(contract.depositAmount)}. ${consequence}`
          : consequence
      }
      reason={{ label: 'Lý do hủy', required: true }}
      confirmLabel="Hủy hợp đồng"
      destructive
      isPending={cancelMutation.isPending}
      error={cancelMutation.error}
      onConfirm={(reason) =>
        cancelMutation.mutate(reason, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã hủy hợp đồng')
          },
        })
      }
    />
  )
}

function ContractDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-48 max-w-full" />
      </div>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
