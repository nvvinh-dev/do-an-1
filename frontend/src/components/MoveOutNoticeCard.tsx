import { FileText } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import type { ContractDetail, MoveOutNotice } from '@/types/contractTypes'
import { formatDate } from '@/utils/formatDate'
import type { ContractViewer } from '@/utils/getMoveOutNoticeActions'

interface MoveOutNoticeCardProps {
  contract: ContractDetail
  viewer: ContractViewer
  /** Hôm nay theo giờ Việt Nam dạng `YYYY-MM-DD`. */
  today: string
  /** Có thì hiện liên kết tới bảng thanh lý (T4 → hóa đơn thanh lý ở T5). L6 đã có nút ở đầu trang nên bỏ trống. */
  settlementLink?: { to: string; label: string } | null
}

/**
 * Khối "Trả phòng" dùng chung cho T4 và L6 (docs/frontend-screens.md mục 5, 6). Hợp đồng đang hiệu lực
 * từ ngày bắt đầu hoặc sắp hết hạn mà chưa có thông báo: câu hướng dẫn gửi thông báo. Đã có thông báo
 * (Đang thanh lý, Đã thanh lý): bên gửi, ngày gửi, ngày trả phòng dự kiến, lý do, `noticeDays` và
 * `penaltyAllowed` do server trả. Trạng thái khác không hiện. Nút gửi và rút nằm ở đầu trang.
 */
export default function MoveOutNoticeCard({ contract, viewer, today, settlementLink }: MoveOutNoticeCardProps) {
  const notice = contract.moveOutNotice

  if (notice) {
    return (
      <CardShell title="Thông báo trả phòng">
        <dl className="grid gap-4 text-sm md:grid-cols-[12rem_1fr]">
          <dt className="text-muted-foreground">Bên gửi</dt>
          <dd>{senderLabel(notice, viewer)}</dd>

          <dt className="text-muted-foreground">Ngày gửi</dt>
          <dd>{formatDate(notice.noticeAt)}</dd>

          <dt className="text-muted-foreground">Ngày trả phòng dự kiến</dt>
          <dd className="font-medium">{formatDate(notice.expectedMoveOutDate)}</dd>

          <dt className="text-muted-foreground">Báo trước</dt>
          <dd>{notice.noticeDays} ngày</dd>

          <dt className="text-muted-foreground">Phí phạt</dt>
          <dd className={notice.penaltyAllowed && contract.depositAmount > 0 ? 'text-warning' : undefined}>
            {penaltySentence(notice, viewer, contract.depositAmount)}
          </dd>

          <dt className="text-muted-foreground">Lý do</dt>
          <dd className="whitespace-pre-line wrap-anywhere">{notice.reason}</dd>
        </dl>

        {contract.status === 'DangThanhLy' && (
          <p className="text-sm text-muted-foreground">{settlingSentence(contract, notice, viewer)}</p>
        )}

        {settlementLink && (
          <Button asChild variant="outline" size="page" className="self-start">
            <Link to={settlementLink.to}>
              <FileText />
              {settlementLink.label}
            </Link>
          </Button>
        )}
      </CardShell>
    )
  }

  const hasStarted = today >= contract.startDate
  if (contract.status === 'SapHetHan' || (contract.status === 'DangHieuLuc' && hasStarted)) {
    return (
      <CardShell title="Trả phòng">
        <p className="text-sm text-muted-foreground">
          {contract.status === 'SapHetHan'
            ? `Hợp đồng sắp hết hạn ngày ${formatDate(contract.endDate)}. Muốn trả phòng thì bấm Gửi thông báo trả phòng; không bên nào gửi thì hợp đồng vẫn hiệu lực theo điều khoản đã chốt.`
            : 'Chưa có thông báo trả phòng. Muốn kết thúc hợp đồng thì bấm Gửi thông báo trả phòng và chọn ngày trả phòng dự kiến; nên báo trước ít nhất 30 ngày.'}
        </p>
      </CardShell>
    )
  }

  return null
}

function CardShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6">
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </div>
  )
}

function senderLabel(notice: MoveOutNotice, viewer: ContractViewer): string {
  if (notice.noticeBy === viewer) return 'Bạn'
  return notice.noticeBy === 'Tenant' ? 'Người thuê' : 'Chủ trọ'
}

/**
 * Câu phí phạt theo `penaltyAllowed` (FR-87); số tiền phạt Chủ trọ ghi ở bảng thanh lý, không tính ở đây.
 * Tổng phí phạt không vượt tiền cọc và mỗi dòng phải lớn hơn 0, nên hợp đồng không đặt cọc thì không có phí phạt.
 */
function penaltySentence(notice: MoveOutNotice, viewer: ContractViewer, depositAmount: number): string {
  if (!notice.penaltyAllowed) {
    return 'Không tính phí phạt.'
  }
  if (depositAmount <= 0) {
    return 'Báo trước ít hơn 30 ngày nhưng hợp đồng không đặt cọc nên không có phí phạt.'
  }
  return viewer === 'Tenant'
    ? 'Bạn báo trước ít hơn 30 ngày và trả phòng trước ngày kết thúc hợp đồng nên Chủ trọ được tính phí phạt, tối đa bằng tiền cọc.'
    : 'Người thuê báo trước ít hơn 30 ngày và trả phòng trước ngày kết thúc hợp đồng nên bạn được thêm dòng phí phạt vào bảng thanh lý, tối đa bằng tiền cọc.'
}

/** Việc tiếp theo khi hợp đồng đang thanh lý, kèm điều kiện rút thông báo (FR-98). */
function settlingSentence(
  contract: ContractDetail,
  notice: MoveOutNotice,
  viewer: ContractViewer,
): string {
  if (contract.settlementInvoiceId !== null) {
    return viewer === 'Tenant'
      ? 'Chủ trọ đã gửi bảng thanh lý; thông báo trả phòng không rút được nữa.'
      : 'Đã có bảng thanh lý; thông báo trả phòng không rút được nữa.'
  }

  const withdrawHint =
    notice.noticeBy === viewer ? ' Bạn là bên gửi nên rút được thông báo khi chưa có bảng thanh lý.' : ''

  if (viewer === 'Tenant') {
    return `Chủ trọ lập bảng thanh lý sau khi bạn trả phòng; bảng gửi tới thì bạn nhận thông báo.${withdrawHint}`
  }
  return `Người thuê đã dọn đi (kể cả sớm hơn ngày dự kiến) thì chốt chỉ số lần cuối rồi bấm Lập bảng thanh lý.${withdrawHint}`
}
