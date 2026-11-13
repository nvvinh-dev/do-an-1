import type { ReactNode } from 'react'
import MoneyText from '@/components/MoneyText'
import PrivatePhotoLink from '@/components/PrivatePhotoLink'
import StatusBadge from '@/components/StatusBadge'
import type { PaymentReport } from '@/types/invoiceTypes'
import { formatDateTime } from '@/utils/formatDateTime'

interface PaymentReportListProps {
  reports: PaymentReport[]
  /** Nút cho lượt báo đang chờ (L8: Xác nhận, Từ chối); không truyền thì chỉ xem (T5). */
  renderPendingActions?: (report: PaymentReport) => ReactNode
}

/**
 * Lịch sử các lượt Người thuê báo đã thanh toán (FR-45–FR-48), lượt mới trước: số tiền khai, ảnh minh chứng,
 * kết quả — số tiền Chủ trọ xác nhận đã thu, hoặc lý do từ chối.
 */
export default function PaymentReportList({ reports, renderPendingActions }: PaymentReportListProps) {
  const sorted = [...reports].sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6">
      <h2 className="text-lg font-medium">Lịch sử báo thanh toán</h2>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có lượt báo thanh toán nào.</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {sorted.map((report) => (
            <li key={report.id} className="flex flex-col gap-2 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">Báo lúc {formatDateTime(report.reportedAt)}</span>
                <StatusBadge kind="paymentReport" status={report.status} />
              </div>
              <span>
                Số tiền báo đã trả: <MoneyText amount={report.reportedAmount} className="font-medium" />
              </span>
              <PrivatePhotoLink url={report.proofImageUrl} label="Xem ảnh minh chứng" />
              {report.status === 'DaXacNhan' && report.confirmedAmount !== null && (
                <span>
                  Đã xác nhận thu <MoneyText amount={report.confirmedAmount} className="font-medium" />
                  {report.confirmedAt && ` lúc ${formatDateTime(report.confirmedAt)}`}
                </span>
              )}
              {report.status === 'TuChoiXacNhan' && report.rejectReason && (
                <span className="whitespace-pre-line wrap-anywhere">Lý do từ chối: {report.rejectReason}</span>
              )}
              {report.status === 'ChoXacNhan' && renderPendingActions?.(report)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
