import {
  Banknote,
  CalendarX,
  ChevronLeft,
  CircleX,
  FilePlus,
  FileText,
  Gauge,
  HandCoins,
  Pencil,
  Send,
  TimerOff,
  Undo2,
} from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import ConfirmDialog from '@/components/ConfirmDialog'
import CountdownText from '@/components/CountdownText'
import FormDialog, { FormDialogBody } from '@/components/FormDialog'
import MoneyText from '@/components/MoneyText'
import MoveOutNoticeCard from '@/components/MoveOutNoticeCard'
import PageHeader from '@/components/PageHeader'
import SendMoveOutNoticeDialog from '@/components/SendMoveOutNoticeDialog'
import StatusBadge from '@/components/StatusBadge'
import WithdrawMoveOutNoticeDialog from '@/components/WithdrawMoveOutNoticeDialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useContract } from '@/hooks/useContract'
import { useContractInvoices } from '@/hooks/useContractInvoices'
import { useLeaseMutation } from '@/hooks/useLeaseMutation'
import { isNotFoundError } from '@/lib/apiError'
import NotFoundPage from '@/pages/public/NotFoundPage'
import {
  cancelContract,
  confirmDeposit,
  recallContract,
  refundDeposit,
  sendContract,
  updateInitialMeterReadings,
} from '@/services/contractService'
import type {
  ConfirmDepositRequest,
  ContractDetail,
  ContractParty,
  InitialMeterReadingsRequest,
  RefundDepositRequest,
} from '@/types/contractTypes'
import type { ContractInvoiceListItem } from '@/types/invoiceTypes'
import type { PaymentMethod } from '@/types/paymentTypes'
import { normalizeMeterIndex, validateMeterIndex } from '@/utils/contractForm'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { formatMeterIndex } from '@/utils/formatMeterIndex'
import { canShowContractInvoices, getLandlordContractActions } from '@/utils/getLandlordContractActions'
import { getMoveOutNoticeActions } from '@/utils/getMoveOutNoticeActions'
import { getVietnamToday } from '@/utils/getVietnamToday'
import { isHoldExpired } from '@/utils/isHoldExpired'
import { getInvoiceTypeLabel } from '@/utils/invoiceTypeLabels'
import { getPaymentMethodLabel } from '@/utils/paymentMethodLabels'
import { normalizeRoomMoney, validateRoomMoney } from '@/utils/validateRoomInput'
import { toVietnamDateTimeInput, vietnamDateTimeInputToIso } from '@/utils/vietnamDateTimeInput'

/** `state` mà liên kết ở trang danh sách gửi kèm: query lọc và trang đang xem, để nút quay lại giữ nguyên. */
interface ContractDetailLocationState {
  listSearch?: string
}

const PAYMENT_METHODS: PaymentMethod[] = ['TienMat', 'ChuyenKhoan']

/**
 * L6 — Chi tiết hợp đồng ở góc nhìn Chủ trọ (docs/frontend-screens.md mục 6). Nút theo bảng "L6 — thao
 * tác theo trạng thái" (`getLandlordContractActions`): nháp → sửa, gửi, hủy; chờ người thuê → thu hồi,
 * hủy; chờ nhận cọc → xác nhận đã nhận cọc, thu hồi, hủy; đang hiệu lực → hủy trước ngày bắt đầu, sửa
 * chỉ số đầu khi chưa có hóa đơn, lập hóa đơn (→ L7) từ ngày bắt đầu; đang thanh lý → lập hóa đơn còn
 * thiếu, mở bảng thanh lý (→ L9); đã hủy chờ hoàn cọc → ghi nhận hoàn cọc. Thông báo trả phòng dùng
 * chung với T4 (`getMoveOutNoticeActions`, `MoveOutNoticeCard`): gửi từ ngày bắt đầu khi đang hiệu lực
 * hoặc sắp hết hạn; rút khi mình là bên gửi và chưa có bảng thanh lý. Thao tác xong thì ở lại trang, hiện
 * `toast` và tải lại dữ liệu (mục 8).
 */
export default function LandlordContractDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  // Mở thẳng từ thông báo, L1 hay L5 thì không có `state`: quay về danh sách không lọc.
  const listSearch = (location.state as ContractDetailLocationState | null)?.listSearch ?? ''
  // Id không phải số thì server trả 404 như hợp đồng không thuộc mình.
  const contractQuery = useContract(Number(id))

  if (isNotFoundError(contractQuery.error)) {
    return <NotFoundPage />
  }

  return (
    <section className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link to={{ pathname: '/landlord/contracts', search: listSearch }}>
          <ChevronLeft />
          Hợp đồng
        </Link>
      </Button>

      {contractQuery.isPending ? (
        <ContractDetailSkeleton />
      ) : contractQuery.isLoadingError ? (
        <ApiErrorAlert error={contractQuery.error} onRetry={() => void contractQuery.refetch()} />
      ) : (
        <>
          {/* Lần tải lại lỗi (quay lại tab, tải lại sau `409`) thì giữ nội dung cũ và hộp thoại đang mở, chỉ báo lỗi kèm nút thử lại. */}
          {contractQuery.isRefetchError && (
            <ApiErrorAlert error={contractQuery.error} onRetry={() => void contractQuery.refetch()} />
          )}
          <ContractDetailContent contract={contractQuery.data} />
        </>
      )}
    </section>
  )
}

type ContractDialog =
  | 'send'
  | 'recall'
  | 'confirmDeposit'
  | 'cancel'
  | 'initialMeter'
  | 'refund'
  | 'sendMoveOutNotice'
  | 'withdrawMoveOutNotice'

function ContractDetailContent({ contract }: { contract: ContractDetail }) {
  const [openDialog, setOpenDialog] = useState<ContractDialog | null>(null)
  const today = getVietnamToday()
  // Chỉ dùng để so với hạn giữ chỗ. Trang đang mở qua mốc hạn thì vẽ lại đúng lúc đó để ẩn các nút.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!contract.holdExpiresAt) {
      return
    }
    const msUntilExpired = new Date(contract.holdExpiresAt).getTime() - Date.now()
    if (msUntilExpired < 0) {
      return
    }
    // Thêm 1 ms vì đúng mốc hạn thì chưa tính là quá hạn (`isHoldExpired`).
    const timer = setTimeout(() => setNow(new Date()), msUntilExpired + 1)
    return () => clearTimeout(timer)
  }, [contract.holdExpiresAt])

  const invoicesQuery = useContractInvoices(contract.id, canShowContractInvoices(contract.status))
  // Chưa tải xong danh sách hóa đơn thì coi như đã có hóa đơn, để không hiện nút sửa chỉ số đầu rồi ẩn đi.
  const hasActiveInvoice = invoicesQuery.data ? invoicesQuery.data.some((invoice) => invoice.status !== 'DaHuy') : true
  const actions = getLandlordContractActions(contract, today, now, hasActiveInvoice)
  const settlementLink = getSettlementLink(contract, today)
  const moveOutActions = getMoveOutNoticeActions(contract, 'Landlord', today)

  const dialogProps = (dialog: ContractDialog) => ({
    contract,
    open: openDialog === dialog,
    onOpenChange: (open: boolean) => setOpenDialog(open ? dialog : null),
  })

  const buttons: ReactNode[] = []
  if (actions.canSend) {
    buttons.push(
      <Button key="send" type="button" size="page" onClick={() => setOpenDialog('send')}>
        <Send />
        Gửi cho người thuê
      </Button>,
    )
  }
  if (actions.canConfirmDeposit) {
    buttons.push(
      <Button key="deposit" type="button" size="page" onClick={() => setOpenDialog('confirmDeposit')}>
        <Banknote />
        Xác nhận đã nhận cọc
      </Button>,
    )
  }
  if (actions.canRecordRefund) {
    buttons.push(
      <Button key="refund" type="button" size="page" onClick={() => setOpenDialog('refund')}>
        <HandCoins />
        Ghi nhận hoàn cọc
      </Button>,
    )
  }
  if (actions.canCreateInvoice) {
    buttons.push(
      <Button key="invoice" asChild size="page" variant={settlementLink ? 'outline' : 'default'}>
        <Link to={`/landlord/contracts/${contract.id}/invoices/new`}>
          <FilePlus />
          {contract.status === 'DangThanhLy' ? 'Lập hóa đơn định kỳ' : 'Lập hóa đơn kỳ tiếp'}
        </Link>
      </Button>,
    )
  }
  if (settlementLink) {
    buttons.push(
      <Button key="settlement" asChild size="page">
        <Link to={`/landlord/contracts/${contract.id}/settlement`}>
          <FileText />
          {settlementLink}
        </Link>
      </Button>,
    )
  }
  if (moveOutActions.canSend) {
    buttons.push(
      <Button
        key="moveOutNotice"
        type="button"
        variant="outline"
        size="page"
        onClick={() => setOpenDialog('sendMoveOutNotice')}
      >
        <CalendarX />
        Gửi thông báo trả phòng
      </Button>,
    )
  }
  if (moveOutActions.canWithdraw) {
    buttons.push(
      <Button
        key="withdrawMoveOutNotice"
        type="button"
        variant="outline"
        size="page"
        onClick={() => setOpenDialog('withdrawMoveOutNotice')}
      >
        <Undo2 />
        Rút thông báo
      </Button>,
    )
  }
  if (actions.canEdit) {
    buttons.push(
      <Button key="edit" asChild variant="outline" size="page">
        <Link to={`/landlord/contracts/${contract.id}/edit`}>
          <Pencil />
          Sửa
        </Link>
      </Button>,
    )
  }
  if (actions.canEditInitialMeter) {
    buttons.push(
      <Button key="meter" type="button" variant="outline" size="page" onClick={() => setOpenDialog('initialMeter')}>
        <Gauge />
        Sửa chỉ số đầu
      </Button>,
    )
  }
  if (actions.canRecall) {
    buttons.push(
      <Button key="recall" type="button" variant="outline" size="page" onClick={() => setOpenDialog('recall')}>
        <Undo2 />
        Thu hồi để sửa
      </Button>,
    )
  }
  if (actions.canCancel) {
    buttons.push(
      <Button key="cancel" type="button" variant="destructive" size="page" onClick={() => setOpenDialog('cancel')}>
        <CircleX />
        Hủy hợp đồng
      </Button>,
    )
  }

  return (
    <>
      <PageHeader
        title={`Hợp đồng phòng ${contract.room.code}`}
        description={`${contract.room.propertyName} · Người thuê: ${contract.tenant.fullName}`}
        action={buttons.length > 0 && <div className="flex flex-col flex-wrap gap-2 md:flex-row">{buttons}</div>}
      />

      {/* Hộp thoại nằm ngoài nút mở nó để không bị gỡ theo nút khi server trả `409` và trang tải lại sang
          trạng thái mới (người thuê vừa đồng ý, hủy; đã quá hạn): vẫn mở và hiện `detail`. */}
      <SendDialog {...dialogProps('send')} />
      <RecallDialog {...dialogProps('recall')} />
      <CancelDialog {...dialogProps('cancel')} />
      <ConfirmDepositDialog {...dialogProps('confirmDeposit')} />
      <InitialMeterDialog {...dialogProps('initialMeter')} />
      <RefundDialog {...dialogProps('refund')} />
      <SendMoveOutNoticeDialog viewer="Landlord" {...dialogProps('sendMoveOutNotice')} />
      <WithdrawMoveOutNoticeDialog viewer="Landlord" {...dialogProps('withdrawMoveOutNotice')} />

      <ContractStatusNotice contract={contract} today={today} now={now} />

      {contract.status === 'DaHuy' && <DepositRefundSection contract={contract} />}

      {/* Lối vào bảng thanh lý đã có ở đầu trang (`getSettlementLink`), nên khối này không lặp lại. */}
      <MoveOutNoticeCard contract={contract} viewer="Landlord" today={today} />

      {actions.showInvoices && (
        <ContractInvoicesSection
          invoices={invoicesQuery.data}
          isPending={invoicesQuery.isPending}
          error={invoicesQuery.isError ? invoicesQuery.error : null}
          onRetry={() => void invoicesQuery.refetch()}
        />
      )}

      <DetailCard title="Các bên">
        <dt className="text-muted-foreground">Người thuê</dt>
        <dd>
          <PartyText party={contract.tenant} />
        </dd>

        <dt className="text-muted-foreground">Chủ trọ</dt>
        <dd>
          <PartyText party={contract.landlord} />
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
            <dt className="text-muted-foreground">Người thuê đồng ý ngày</dt>
            <dd>{formatDate(contract.tenantConfirmedAt)}</dd>
          </>
        )}

        {contract.depositReceivedAt && (
          <>
            <dt className="text-muted-foreground">Nhận cọc</dt>
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
              <MoneyText amount={fee.amount} /> / tháng
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

/**
 * Lối vào bảng thanh lý (L9): đã có bảng thì mở bảng; đang thanh lý mà chưa có bảng thì lập được từ
 * ngày trả phòng dự kiến (docs/frontend-screens.md mục 6, dòng `DangThanhLy`).
 */
function getSettlementLink(contract: ContractDetail, today: string): string | null {
  if (contract.settlementInvoiceId !== null) {
    return contract.status === 'DaThanhLy' ? 'Xem bảng thanh lý' : 'Mở bảng thanh lý'
  }
  if (contract.status === 'DangThanhLy' && contract.moveOutNotice && today >= contract.moveOutNotice.expectedMoveOutDate) {
    return 'Lập bảng thanh lý'
  }
  return null
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
      hiệu lực thì hợp đồng tự hủy và phòng trở lại Trống.
    </p>
  )
}

interface ContractStatusNoticeProps {
  contract: ContractDetail
  today: string
  now: Date
}

/** Khối đầu trang nói rõ hợp đồng đang ở đâu và Chủ trọ cần làm gì tiếp, theo bảng L6. */
function ContractStatusNotice({ contract, today, now }: ContractStatusNoticeProps) {
  // `holdExpiresAt` chỉ có ở `Nhap`, `ChoNguoiThueXacNhan`, `ChoNhanCoc`.
  if (isHoldExpired(contract.holdExpiresAt, now)) {
    return (
      <Alert variant="destructive">
        <TimerOff />
        <AlertTitle>Đã quá hạn giữ chỗ 72 giờ</AlertTitle>
        <AlertDescription>
          <p>Hợp đồng chưa có hiệu lực trong hạn nên sẽ tự hủy và phòng trở lại Trống.</p>
          {contract.depositAmount > 0 && <p>Không nhận tiền cọc cho hợp đồng này.</p>}
        </AlertDescription>
      </Alert>
    )
  }

  switch (contract.status) {
    case 'Nhap':
      return (
        <Alert>
          <AlertTitle>Hợp đồng nháp</AlertTitle>
          <AlertDescription>
            <p>Người thuê xem được nhưng chưa đồng ý được. Kiểm tra điều khoản rồi bấm Gửi cho người thuê.</p>
            <HoldDeadline holdExpiresAt={contract.holdExpiresAt} />
          </AlertDescription>
        </Alert>
      )

    case 'ChoNguoiThueXacNhan':
      return (
        <Alert>
          <AlertTitle>Đã gửi, chờ người thuê xác nhận</AlertTitle>
          <AlertDescription>
            <p>Người thuê đồng ý hoặc yêu cầu sửa; cần sửa ngay thì bấm Thu hồi để sửa.</p>
            <HoldDeadline holdExpiresAt={contract.holdExpiresAt} />
          </AlertDescription>
        </Alert>
      )

    case 'ChoNhanCoc':
      return (
        <Alert className="border-warning/40">
          <AlertTitle>Người thuê đã đồng ý, chờ nhận cọc</AlertTitle>
          <AlertDescription>
            <p>
              Nhận đủ tiền cọc {formatCurrency(contract.depositAmount)} rồi bấm Xác nhận đã nhận cọc; hợp đồng có hiệu
              lực và phòng chuyển sang Đang thuê.
            </p>
            <HoldDeadline holdExpiresAt={contract.holdExpiresAt} />
          </AlertDescription>
        </Alert>
      )

    case 'DangHieuLuc':
      if (today >= contract.startDate) {
        return null
      }
      return (
        <Alert className="border-success/40">
          <AlertTitle>Hợp đồng đã có hiệu lực</AlertTitle>
          <AlertDescription>
            <p>
              Người thuê vào ở từ ngày {formatDate(contract.startDate)}. Hóa đơn đầu tiên lập được từ ngày này; trước đó
              vẫn hủy được hợp đồng.
            </p>
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

    // `SapHetHan`, `DangThanhLy`: khối trả phòng (`MoveOutNoticeCard`) nói rõ việc tiếp theo.
    default:
      return null
  }
}

function cancelledSentence(contract: ContractDetail): string {
  const date = contract.cancelledAt ? ` ngày ${formatDate(contract.cancelledAt)}` : ''
  switch (contract.cancelledBy) {
    case 'Tenant':
      return `Người thuê đã hủy hợp đồng${date}.`
    case 'Landlord':
      return `Bạn đã hủy hợp đồng${date}.`
    case 'System':
      return `Hệ thống tự hủy hợp đồng${date} vì quá hạn giữ chỗ mà hợp đồng chưa có hiệu lực.`
    default:
      return `Hợp đồng đã hủy${date}.`
  }
}

/** Hoàn cọc của hợp đồng đã hủy (FR-86): đã hoàn thì hiện chi tiết; đã nhận cọc mà chưa hoàn thì nhắc ghi nhận. */
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
            <dt className="text-muted-foreground">
              {refund.amount < contract.depositAmount ? 'Lý do giữ lại' : 'Ghi chú'}
            </dt>
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
          ? 'Người thuê là bên hủy nên bạn được giữ lại tối đa toàn bộ tiền cọc; phần giữ lại phải ghi rõ lý do. Hoàn xong thì bấm Ghi nhận hoàn cọc.'
          : 'Người thuê được hoàn toàn bộ tiền cọc. Hoàn xong thì bấm Ghi nhận hoàn cọc.'
      }
    >
      <dt className="text-muted-foreground">Trạng thái</dt>
      <dd className="font-medium text-warning">Chờ hoàn cọc</dd>

      <dt className="text-muted-foreground">Tiền cọc đã nhận</dt>
      <dd>
        <MoneyText amount={contract.depositAmount} />
      </dd>
    </DetailCard>
  )
}

interface ContractInvoicesSectionProps {
  invoices: ContractInvoiceListItem[] | undefined
  isPending: boolean
  error: unknown
  onRetry: () => void
}

/** Hóa đơn của hợp đồng, kỳ mới trước; bấm để mở chi tiết ở L8. */
function ContractInvoicesSection({ invoices, isPending, error, onRetry }: ContractInvoicesSectionProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6">
      <h2 className="text-lg font-medium">Hóa đơn</h2>
      {/* Lỗi tải lại nền thì giữ danh sách cũ, chỉ báo lỗi kèm nút thử lại. */}
      <ApiErrorAlert error={error} onRetry={onRetry} />
      {invoices === undefined ? (
        isPending && (
          <div className="flex flex-col gap-2" aria-busy="true">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )
      ) : invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có hóa đơn nào.</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {invoices.map((invoice) => (
            <li key={invoice.id}>
              <Link
                to={`/landlord/invoices/${invoice.id}`}
                className="flex flex-col gap-1 py-3 outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 md:flex-row md:items-center md:justify-between md:gap-4"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {getInvoiceTypeLabel(invoice.type)}
                    {invoice.dueDate && ` · Hạn ${formatDate(invoice.dueDate)}`}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="tabular-nums">
                    Đã thu <MoneyText amount={invoice.paidAmount} /> / <MoneyText amount={invoice.totalAmount} />
                  </span>
                  <StatusBadge kind="invoice" status={invoice.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface ContractDialogProps {
  contract: ContractDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Gửi cho người thuê: hợp đồng sang chờ người thuê xác nhận, người thuê nhận thông báo. */
function SendDialog({ contract, open, onOpenChange }: ContractDialogProps) {
  const mutation = useLeaseMutation(() => sendContract(contract.id))

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Gửi hợp đồng cho người thuê"
      description={`${contract.tenant.fullName} nhận thông báo để kiểm tra và đồng ý hợp đồng. Sau khi gửi, muốn sửa thì phải thu hồi về nháp.`}
      confirmLabel="Gửi"
      isPending={mutation.isPending}
      error={mutation.error}
      onConfirm={() =>
        mutation.mutate(undefined, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã gửi hợp đồng cho người thuê')
          },
        })
      }
    />
  )
}

/** Thu hồi để sửa (FR-102): về nháp, xóa xác nhận của người thuê; hạn giữ chỗ không đổi. */
function RecallDialog({ contract, open, onOpenChange }: ContractDialogProps) {
  const mutation = useLeaseMutation(() => recallContract(contract.id))

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Thu hồi hợp đồng để sửa"
      description={`Hợp đồng về nháp${contract.status === 'ChoNhanCoc' ? ', xác nhận của người thuê bị xóa' : ''}; sửa xong phải gửi lại để người thuê đồng ý lại. Hạn giữ chỗ 72 giờ không đổi. Người thuê nhận thông báo.`}
      confirmLabel="Thu hồi"
      isPending={mutation.isPending}
      error={mutation.error}
      onConfirm={() =>
        mutation.mutate(undefined, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã thu hồi hợp đồng về nháp')
          },
        })
      }
    />
  )
}

/** Hủy trước ngày bắt đầu (FR-75, FR-76): bắt buộc lý do; Chủ trọ hủy khi đã nhận cọc thì hoàn đủ cọc (BR-22). */
function CancelDialog({ contract, open, onOpenChange }: ContractDialogProps) {
  const mutation = useLeaseMutation((reason: string) => cancelContract(contract.id, { reason }))
  const refundNote = contract.depositReceivedAt
    ? ` Bạn đã nhận cọc nên phải hoàn toàn bộ ${formatCurrency(contract.depositAmount)} cho người thuê rồi ghi nhận hoàn cọc.`
    : ''

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Hủy hợp đồng"
      description={`Phòng ${contract.room.code} trở lại Trống và hiển thị lại, người thuê nhận thông báo kèm lý do.${refundNote} Hợp đồng đã hủy không khôi phục được.`}
      reason={{ label: 'Lý do hủy', required: true }}
      confirmLabel="Hủy hợp đồng"
      destructive
      isPending={mutation.isPending}
      error={mutation.error}
      onConfirm={(reason) =>
        mutation.mutate(reason, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success('Đã hủy hợp đồng')
          },
        })
      }
    />
  )
}

/** Xác nhận đã nhận cọc (BR-21): hợp đồng có hiệu lực, phòng sang Đang thuê, hai bên nhận thông báo. */
function ConfirmDepositDialog({ contract, open, onOpenChange }: ContractDialogProps) {
  const mutation = useLeaseMutation((request: ConfirmDepositRequest) => confirmDeposit(contract.id, request))

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} isPending={mutation.isPending}>
      <ConfirmDepositBody
        contract={contract}
        isPending={mutation.isPending}
        error={mutation.error}
        onSubmit={(request) =>
          mutation.mutate(request, {
            onSuccess: () => {
              onOpenChange(false)
              toast.success('Đã xác nhận nhận cọc, hợp đồng có hiệu lực')
            },
          })
        }
      />
    </FormDialog>
  )
}

interface DialogBodyProps<TRequest> {
  contract: ContractDetail
  isPending: boolean
  error: unknown
  onSubmit: (request: TRequest) => void
}

function ConfirmDepositBody({ contract, isPending, error, onSubmit }: DialogBodyProps<ConfirmDepositRequest>) {
  const [receivedAt, setReceivedAt] = useState(() => toVietnamDateTimeInput(new Date()))
  const [method, setMethod] = useState<PaymentMethod | ''>('')
  const [showErrors, setShowErrors] = useState(false)
  const receivedAtError = validateTimeNotFuture(receivedAt, 'Vui lòng chọn thời điểm nhận cọc.')
  const methodError = method === '' ? 'Vui lòng chọn hình thức.' : null
  const ids = useIds()

  return (
    <FormDialogBody
      title="Xác nhận đã nhận cọc"
      description={`Xác nhận đã nhận đủ tiền cọc ${formatCurrency(contract.depositAmount)} của ${contract.tenant.fullName}. Hợp đồng có hiệu lực và phòng ${contract.room.code} chuyển sang Đang thuê.`}
      confirmLabel="Xác nhận"
      isPending={isPending}
      error={error}
      validate={() => {
        setShowErrors(true)
        return receivedAtError === null && methodError === null
      }}
      onSubmit={() => onSubmit({ receivedAt: vietnamDateTimeInputToIso(receivedAt) ?? '', method: method as PaymentMethod })}
    >
      <DateTimeField
        id={ids.time}
        label="Thời điểm nhận cọc"
        value={receivedAt}
        onChange={setReceivedAt}
        error={showErrors ? receivedAtError : null}
        disabled={isPending}
      />
      <PaymentMethodField
        id={ids.method}
        value={method}
        onChange={setMethod}
        error={showErrors ? methodError : null}
        disabled={isPending}
      />
    </FormDialogBody>
  )
}

/** Sửa chỉ số đầu (FR-90): chỉ khi chưa có hóa đơn; ghi nhật ký, người thuê nhận thông báo. */
function InitialMeterDialog({ contract, open, onOpenChange }: ContractDialogProps) {
  const mutation = useLeaseMutation((request: InitialMeterReadingsRequest) =>
    updateInitialMeterReadings(contract.id, request),
  )

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} isPending={mutation.isPending}>
      <InitialMeterBody
        contract={contract}
        isPending={mutation.isPending}
        error={mutation.error}
        onSubmit={(request) =>
          mutation.mutate(request, {
            onSuccess: () => {
              onOpenChange(false)
              toast.success('Đã sửa chỉ số đầu')
            },
          })
        }
      />
    </FormDialog>
  )
}

function InitialMeterBody({ contract, isPending, error, onSubmit }: DialogBodyProps<InitialMeterReadingsRequest>) {
  const [electricity, setElectricity] = useState(() => String(contract.initialElectricityIndex).replace('.', ','))
  const [water, setWater] = useState(() => String(contract.initialWaterIndex).replace('.', ','))
  const [showErrors, setShowErrors] = useState(false)
  const electricityError = toError(validateMeterIndex(electricity))
  const waterError = toError(validateMeterIndex(water))
  const ids = useIds()

  return (
    <FormDialogBody
      title="Sửa chỉ số đầu"
      description="Chỉ số đầu là chỉ số cũ của hóa đơn đầu tiên. Mỗi lần sửa được ghi nhật ký và người thuê nhận thông báo."
      confirmLabel="Lưu chỉ số"
      isPending={isPending}
      error={error}
      validate={() => {
        setShowErrors(true)
        return electricityError === null && waterError === null
      }}
      onSubmit={() =>
        onSubmit({
          initialElectricityIndex: Number(normalizeMeterIndex(electricity)),
          initialWaterIndex: Number(normalizeMeterIndex(water)),
        })
      }
    >
      <TextField
        id={ids.time}
        label="Chỉ số điện đầu (kWh)"
        value={electricity}
        onChange={setElectricity}
        inputMode="decimal"
        error={showErrors ? electricityError : null}
        disabled={isPending}
      />
      <TextField
        id={ids.method}
        label="Chỉ số nước đầu (m³)"
        value={water}
        onChange={setWater}
        inputMode="decimal"
        error={showErrors ? waterError : null}
        disabled={isPending}
      />
    </FormDialogBody>
  )
}

/**
 * Ghi nhận hoàn cọc (FR-86). Chủ trọ hủy: server hoàn đủ cọc, chỉ nhập ngày và hình thức. Người thuê
 * hủy: nhập số hoàn từ 0 tới tiền cọc, kèm lý do khi giữ lại (BR-22).
 */
function RefundDialog({ contract, open, onOpenChange }: ContractDialogProps) {
  const mutation = useLeaseMutation((request: RefundDepositRequest) => refundDeposit(contract.id, request))

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} isPending={mutation.isPending}>
      <RefundBody
        contract={contract}
        isPending={mutation.isPending}
        error={mutation.error}
        onSubmit={(request) =>
          mutation.mutate(request, {
            onSuccess: () => {
              onOpenChange(false)
              toast.success('Đã ghi nhận hoàn cọc')
            },
          })
        }
      />
    </FormDialog>
  )
}

function RefundBody({ contract, isPending, error, onSubmit }: DialogBodyProps<RefundDepositRequest>) {
  const tenantCancelled = contract.cancelledBy === 'Tenant'
  const [refundedAt, setRefundedAt] = useState(() => toVietnamDateTimeInput(new Date()))
  const [method, setMethod] = useState<PaymentMethod | ''>('')
  const [amount, setAmount] = useState(() => String(contract.depositAmount))
  const [note, setNote] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const ids = useIds()

  const cancelledAtInput = contract.cancelledAt ? toVietnamDateTimeInput(new Date(contract.cancelledAt)) : null
  const refundedAtError =
    validateTimeNotFuture(refundedAt, 'Vui lòng chọn thời điểm hoàn cọc.') ??
    (cancelledAtInput && refundedAt < cancelledAtInput ? 'Thời điểm hoàn cọc không được trước lúc hủy hợp đồng.' : null)
  const methodError = method === '' ? 'Vui lòng chọn hình thức.' : null
  const amountValue = Number(normalizeRoomMoney(amount))
  const amountError = !tenantCancelled
    ? null
    : (toError(validateRoomMoney(amount)) ??
      (amountValue > contract.depositAmount ? 'Số hoàn không được lớn hơn tiền cọc.' : null))
  const keepsPart = tenantCancelled && amountError === null && amountValue < contract.depositAmount
  const noteError = keepsPart && note.trim() === '' ? 'Ghi lý do giữ lại một phần tiền cọc.' : null

  return (
    <FormDialogBody
      title="Ghi nhận hoàn cọc"
      description={
        tenantCancelled
          ? `Người thuê là bên hủy: nhập số tiền đã hoàn, từ 0 tới tiền cọc ${formatCurrency(contract.depositAmount)}. Người thuê nhận thông báo.`
          : `Bạn là bên hủy nên hoàn toàn bộ tiền cọc ${formatCurrency(contract.depositAmount)}. Người thuê nhận thông báo.`
      }
      confirmLabel="Ghi nhận"
      isPending={isPending}
      error={error}
      validate={() => {
        setShowErrors(true)
        return refundedAtError === null && methodError === null && amountError === null && noteError === null
      }}
      onSubmit={() =>
        onSubmit({
          refundedAt: clampToCancelledAt(vietnamDateTimeInputToIso(refundedAt) ?? '', contract.cancelledAt),
          refundMethod: method as PaymentMethod,
          amount: tenantCancelled ? amountValue : null,
          note: tenantCancelled && note.trim() !== '' ? note.trim() : null,
        })
      }
    >
      <DateTimeField
        id={ids.time}
        label="Thời điểm hoàn cọc"
        value={refundedAt}
        onChange={setRefundedAt}
        error={showErrors ? refundedAtError : null}
        disabled={isPending}
      />
      <PaymentMethodField
        id={ids.method}
        value={method}
        onChange={setMethod}
        error={showErrors ? methodError : null}
        disabled={isPending}
      />
      {tenantCancelled && (
        <>
          <TextField
            id={ids.amount}
            label="Số tiền đã hoàn (₫)"
            value={amount}
            onChange={setAmount}
            inputMode="numeric"
            error={showErrors ? amountError : null}
            disabled={isPending}
          />
          <Field data-invalid={showErrors && noteError !== null}>
            <FieldLabel htmlFor={ids.note}>
              {keepsPart ? 'Lý do giữ lại' : 'Ghi chú'}
              {keepsPart && <span aria-hidden="true"> *</span>}
            </FieldLabel>
            <Textarea
              id={ids.note}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={isPending}
              aria-invalid={showErrors && noteError !== null}
            />
            {keepsPart && <FieldDescription>Bắt buộc khi hoàn ít hơn tiền cọc.</FieldDescription>}
            {showErrors && noteError && <FieldError>{noteError}</FieldError>}
          </Field>
        </>
      )}
    </FormDialogBody>
  )
}

/**
 * Ô `datetime-local` chỉ tới phút: chọn đúng phút hủy hợp đồng thì giá trị gửi đi (giây 00) có thể sớm hơn
 * lúc hủy vài giây và server trả `422`. Khi đó gửi chính thời điểm hủy; phút sớm hơn đã bị chặn ở form.
 */
function clampToCancelledAt(refundedAtIso: string, cancelledAt: string | null): string {
  if (!cancelledAt) return refundedAtIso
  return new Date(refundedAtIso).getTime() < new Date(cancelledAt).getTime() ? cancelledAt : refundedAtIso
}

function useIds() {
  const base = useId()
  return { time: `${base}-time`, method: `${base}-method`, amount: `${base}-amount`, note: `${base}-note` }
}

function toError(result: true | string): string | null {
  return result === true ? null : result
}

/** Ô `datetime-local` theo giờ Việt Nam: bắt buộc, không sau thời điểm hiện tại (server trả `422`). */
function validateTimeNotFuture(value: string, emptyMessage: string): string | null {
  if (vietnamDateTimeInputToIso(value) === null) return emptyMessage
  return value > toVietnamDateTimeInput(new Date()) ? 'Không được sau thời điểm hiện tại.' : null
}

interface InputFieldProps<T extends string> {
  id: string
  label: string
  value: T
  onChange: (value: T) => void
  error: string | null
  disabled: boolean
}

function DateTimeField({ id, label, value, onChange, error, disabled }: InputFieldProps<string>) {
  return (
    <Field data-invalid={error !== null}>
      <FieldLabel htmlFor={id}>
        {label} <span aria-hidden="true">*</span>
      </FieldLabel>
      <Input
        id={id}
        type="datetime-local"
        value={value}
        max={toVietnamDateTimeInput(new Date())}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-invalid={error !== null}
      />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

function PaymentMethodField({ id, value, onChange, error, disabled }: Omit<InputFieldProps<PaymentMethod | ''>, 'label'>) {
  return (
    <Field data-invalid={error !== null}>
      <FieldLabel htmlFor={id}>
        Hình thức <span aria-hidden="true">*</span>
      </FieldLabel>
      <NativeSelect
        id={id}
        className="w-full"
        value={value}
        onChange={(event) => onChange(event.target.value as PaymentMethod | '')}
        disabled={disabled}
        aria-invalid={error !== null}
      >
        <NativeSelectOption value="">Chọn hình thức</NativeSelectOption>
        {PAYMENT_METHODS.map((method) => (
          <NativeSelectOption key={method} value={method}>
            {getPaymentMethodLabel(method)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  inputMode,
}: InputFieldProps<string> & { inputMode: 'decimal' | 'numeric' }) {
  return (
    <Field data-invalid={error !== null}>
      <FieldLabel htmlFor={id}>
        {label} <span aria-hidden="true">*</span>
      </FieldLabel>
      <Input
        id={id}
        value={value}
        inputMode={inputMode}
        className="tabular-nums"
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-invalid={error !== null}
      />
      {error && <FieldError>{error}</FieldError>}
    </Field>
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
