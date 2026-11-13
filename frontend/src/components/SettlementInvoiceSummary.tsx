import { ImageIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import MoneyText from '@/components/MoneyText'
import StatusBadge from '@/components/StatusBadge'
import type { InvoiceDetail } from '@/types/invoiceTypes'
import { formatDate } from '@/utils/formatDate'
import { formatMeterIndex } from '@/utils/formatMeterIndex'
import { getInvoiceLineCategoryLabel } from '@/utils/invoiceLineCategoryLabels'

interface SettlementInvoiceSummaryProps {
  invoice: InvoiceDetail
  /** Đường dẫn chi tiết hóa đơn gốc của dòng công nợ, điều chỉnh, theo vai trò đang xem (L8 hoặc T5). */
  invoicePath: (invoiceId: number) => string
}

/**
 * Nội dung bảng thanh lý (FR-55, FR-58): kỳ, điện nước lần cuối, tiền phòng và phí dịch vụ của kỳ cuối, từng
 * dòng khấu trừ kèm ảnh, và số dư hiện rõ chiều. Mọi số tiền là số server trả; số điện, nước đã dùng chỉ là
 * hiệu hai chỉ số để Chủ trọ và người thuê đối chiếu, như L7.
 */
export default function SettlementInvoiceSummary({ invoice, invoicePath }: SettlementInvoiceSummaryProps) {
  const electricityUsed = invoice.currentElectricityIndex - invoice.previousElectricityIndex
  const waterUsed = invoice.currentWaterIndex - invoice.previousWaterIndex

  return (
    <div className="flex flex-col gap-6">
      <SummaryCard title="Kỳ cuối">
        <dl className="grid gap-4 text-sm md:grid-cols-[12rem_1fr]">
          <dt className="text-muted-foreground">Trạng thái</dt>
          <dd>
            <StatusBadge kind="invoice" status={invoice.status} />
          </dd>

          <dt className="text-muted-foreground">Ngày trả phòng thực tế</dt>
          <dd className="font-medium">{formatDate(invoice.periodEnd)}</dd>

          <dt className="text-muted-foreground">Kỳ tính tiền</dt>
          <dd>
            {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
          </dd>

          <dt className="text-muted-foreground">Tiền phòng</dt>
          <dd>
            {invoice.daysCharged === 0 ? (
              <span className="text-muted-foreground">Không tính — tháng trả phòng đã có hóa đơn định kỳ.</span>
            ) : (
              <>
                <MoneyText amount={invoice.rentAmount} />{' '}
                <span className="text-muted-foreground">
                  ({invoice.daysCharged}/{invoice.daysInMonth} ngày)
                </span>
              </>
            )}
          </dd>

          {invoice.daysCharged > 0 && (
            <>
              <dt className="text-muted-foreground">Phí dịch vụ</dt>
              <dd>
                <MoneyText amount={invoice.serviceFeeAmount} />
                {invoice.serviceFees.length > 0 && (
                  <span className="block text-muted-foreground wrap-anywhere">
                    {invoice.serviceFees.map((fee) => fee.name).join(', ')}
                  </span>
                )}
              </dd>
            </>
          )}

          <dt className="text-muted-foreground">Điện</dt>
          <dd className="flex flex-col gap-1">
            <span className="tabular-nums">
              {formatMeterIndex(invoice.previousElectricityIndex)} → {formatMeterIndex(invoice.currentElectricityIndex)}{' '}
              kWh (dùng {formatMeterIndex(electricityUsed)} kWh × <MoneyText amount={invoice.electricityUnitPrice} />)
            </span>
            <MoneyText amount={invoice.electricityAmount} className="font-medium" />
            <PhotoLink url={invoice.electricityMeterPhotoUrl} label="Xem ảnh đồng hồ điện" />
          </dd>

          <dt className="text-muted-foreground">Nước</dt>
          <dd className="flex flex-col gap-1">
            <span className="tabular-nums">
              {formatMeterIndex(invoice.previousWaterIndex)} → {formatMeterIndex(invoice.currentWaterIndex)} m³ (dùng{' '}
              {formatMeterIndex(waterUsed)} m³ × <MoneyText amount={invoice.waterUnitPrice} />)
            </span>
            <MoneyText amount={invoice.waterAmount} className="font-medium" />
            <PhotoLink url={invoice.waterMeterPhotoUrl} label="Xem ảnh đồng hồ nước" />
          </dd>
        </dl>
      </SummaryCard>

      <SummaryCard title="Các khoản cộng, trừ">
        {invoice.lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Không có khoản nào.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {invoice.lines.map((line, index) => (
              <li
                key={index}
                className="flex flex-col gap-1 py-3 text-sm md:flex-row md:items-start md:justify-between md:gap-4"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-medium">{getInvoiceLineCategoryLabel(line.category)}</span>
                  <span className="whitespace-pre-line text-muted-foreground wrap-anywhere">{line.description}</span>
                  {line.relatedInvoiceId !== null && (
                    <Link to={invoicePath(line.relatedInvoiceId)} className="self-start underline underline-offset-4">
                      Hóa đơn gốc #{line.relatedInvoiceId}
                    </Link>
                  )}
                  <PhotoLink url={line.evidenceUrl} label="Xem ảnh hư hỏng" />
                </span>
                <MoneyText amount={line.amount} className="font-medium md:shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </SummaryCard>

      <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6">
        <h2 className="text-lg font-medium">Số dư</h2>
        {invoice.totalAmount === 0 ? (
          <p className="text-sm">Hai bên không còn khoản nào phải trả.</p>
        ) : (
          <MoneyText amount={invoice.totalAmount} settlementBalance className="text-2xl font-semibold" />
        )}
        {invoice.totalAmount > 0 && invoice.status !== 'Nhap' && invoice.status !== 'ChoNguoiThueXacNhan' && (
          <p className="text-sm text-muted-foreground">
            Đã thu <MoneyText amount={invoice.paidAmount} />
            {invoice.dueDate && ` · Hạn thanh toán ${formatDate(invoice.dueDate)}`}
          </p>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6">
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </div>
  )
}

/** Ảnh riêng tư là URL có chữ ký hết hạn sau 1 giờ; mở ở tab mới, quá hạn thì tải lại trang. */
function PhotoLink({ url, label }: { url: string | null; label: string }) {
  if (url === null) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 self-start underline underline-offset-4"
    >
      <ImageIcon className="size-4" aria-hidden="true" />
      {label}
    </a>
  )
}
