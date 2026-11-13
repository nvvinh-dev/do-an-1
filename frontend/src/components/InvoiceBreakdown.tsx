import type { ReactNode } from 'react'
import { Link } from 'react-router'
import MoneyText from '@/components/MoneyText'
import PrivatePhotoLink from '@/components/PrivatePhotoLink'
import StatusBadge from '@/components/StatusBadge'
import type { InvoiceDetail } from '@/types/invoiceTypes'
import { formatDate } from '@/utils/formatDate'
import { formatDateTime } from '@/utils/formatDateTime'
import { formatMeterIndex } from '@/utils/formatMeterIndex'

interface InvoiceBreakdownProps {
  /** Hóa đơn định kỳ lấy từ `GET /invoices/{id}`. Hóa đơn thanh lý dùng `SettlementInvoiceSummary`. */
  invoice: InvoiceDetail
  /** Đường dẫn chi tiết hóa đơn gốc của dòng điều chỉnh, theo vai trò đang xem (L8 hoặc T5). */
  invoicePath: (invoiceId: number) => string
}

/**
 * Cách tính hóa đơn định kỳ để người thuê hiểu từng khoản (FR-44, QR-01): tiền phòng theo số ngày, phí dịch vụ,
 * điện nước từ chỉ số cũ tới mới nhân đơn giá, các dòng điều chỉnh, tổng; kèm trạng thái thanh toán. Mọi số tiền
 * là số server trả; số điện, nước đã dùng chỉ là hiệu hai chỉ số để đối chiếu với đồng hồ.
 */
export default function InvoiceBreakdown({ invoice, invoicePath }: InvoiceBreakdownProps) {
  const electricityUsed = invoice.currentElectricityIndex - invoice.previousElectricityIndex
  const waterUsed = invoice.currentWaterIndex - invoice.previousWaterIndex
  const isFullMonth = invoice.daysCharged === invoice.daysInMonth

  return (
    <div className="flex flex-col gap-6">
      <BreakdownCard title="Thanh toán">
        <dl className="grid gap-4 text-sm md:grid-cols-[12rem_1fr]">
          <dt className="text-muted-foreground">Trạng thái</dt>
          <dd>
            <StatusBadge kind="invoice" status={invoice.status} />
          </dd>

          <dt className="text-muted-foreground">Tổng tiền</dt>
          <dd>
            <MoneyText amount={invoice.totalAmount} className="text-2xl font-bold" />
          </dd>

          {invoice.issuedAt && (
            <>
              <dt className="text-muted-foreground">Đã thu</dt>
              <dd>
                <MoneyText amount={invoice.paidAmount} />
              </dd>

              <dt className="text-muted-foreground">Ngày phát hành</dt>
              <dd>{formatDate(invoice.issuedAt)}</dd>
            </>
          )}

          {invoice.dueDate && (
            <>
              <dt className="text-muted-foreground">Hạn thanh toán</dt>
              <dd>{formatDate(invoice.dueDate)}</dd>
            </>
          )}

          {invoice.settledAt && invoice.status === 'DaThanhToan' && (
            <>
              <dt className="text-muted-foreground">Thanh toán đủ lúc</dt>
              <dd>{formatDateTime(invoice.settledAt)}</dd>
            </>
          )}

          {invoice.cancelReason && (
            <>
              <dt className="text-muted-foreground">Lý do hủy</dt>
              <dd className="whitespace-pre-line wrap-anywhere">{invoice.cancelReason}</dd>
            </>
          )}
        </dl>
      </BreakdownCard>

      <BreakdownCard title="Cách tính">
        <dl className="grid gap-4 text-sm md:grid-cols-[12rem_1fr]">
          <dt className="text-muted-foreground">Kỳ</dt>
          <dd className="font-medium">
            {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
          </dd>

          <dt className="text-muted-foreground">Tiền phòng</dt>
          <dd className="flex flex-col gap-1">
            <MoneyText amount={invoice.rentAmount} className="font-medium" />
            <span className="text-muted-foreground">
              {isFullMonth
                ? 'Trọn tháng'
                : `Ở ${invoice.daysCharged}/${invoice.daysInMonth} ngày của tháng, tính theo tỷ lệ ngày`}
            </span>
          </dd>

          <dt className="text-muted-foreground">Phí dịch vụ</dt>
          <dd className="flex flex-col gap-1">
            <MoneyText amount={invoice.serviceFeeAmount} className="font-medium" />
            {invoice.serviceFees.length === 0 ? (
              <span className="text-muted-foreground">Hợp đồng không có phí dịch vụ.</span>
            ) : (
              <ul className="flex flex-col gap-0.5 text-muted-foreground">
                {invoice.serviceFees.map((fee, index) => (
                  <li key={index} className="wrap-anywhere">
                    {fee.name}: <MoneyText amount={fee.amount} /> / tháng
                  </li>
                ))}
                {!isFullMonth && <li>Tổng phí tính theo cùng tỷ lệ ngày như tiền phòng.</li>}
              </ul>
            )}
          </dd>

          <dt className="text-muted-foreground">Điện</dt>
          <dd className="flex flex-col gap-1">
            <MoneyText amount={invoice.electricityAmount} className="font-medium" />
            <span className="text-muted-foreground tabular-nums">
              {formatMeterIndex(invoice.previousElectricityIndex)} → {formatMeterIndex(invoice.currentElectricityIndex)}{' '}
              kWh, dùng {formatMeterIndex(electricityUsed)} kWh × <MoneyText amount={invoice.electricityUnitPrice} />
            </span>
            <PrivatePhotoLink url={invoice.electricityMeterPhotoUrl} label="Xem ảnh đồng hồ điện" />
          </dd>

          <dt className="text-muted-foreground">Nước</dt>
          <dd className="flex flex-col gap-1">
            <MoneyText amount={invoice.waterAmount} className="font-medium" />
            <span className="text-muted-foreground tabular-nums">
              {formatMeterIndex(invoice.previousWaterIndex)} → {formatMeterIndex(invoice.currentWaterIndex)} m³, dùng{' '}
              {formatMeterIndex(waterUsed)} m³ × <MoneyText amount={invoice.waterUnitPrice} />
            </span>
            <PrivatePhotoLink url={invoice.waterMeterPhotoUrl} label="Xem ảnh đồng hồ nước" />
          </dd>
        </dl>

        {invoice.lines.length > 0 && (
          <div className="flex flex-col gap-2 border-t pt-4">
            <h3 className="text-sm font-medium">Điều chỉnh</h3>
            <ul className="flex flex-col divide-y">
              {invoice.lines.map((line, index) => (
                <li
                  key={index}
                  className="flex flex-col gap-1 py-3 text-sm md:flex-row md:items-start md:justify-between md:gap-4"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="whitespace-pre-line wrap-anywhere">{line.description}</span>
                    {line.relatedInvoiceId !== null && (
                      <Link to={invoicePath(line.relatedInvoiceId)} className="self-start underline underline-offset-4">
                        Hóa đơn gốc #{line.relatedInvoiceId}
                      </Link>
                    )}
                  </span>
                  <MoneyText amount={line.amount} className="font-medium md:shrink-0" />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-baseline justify-between gap-4 border-t pt-4">
          <span className="font-medium">Tổng</span>
          <MoneyText amount={invoice.totalAmount} className="text-lg font-semibold" />
        </div>
      </BreakdownCard>
    </div>
  )
}

function BreakdownCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6">
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </div>
  )
}
