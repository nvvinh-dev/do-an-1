import MoneyText from '@/components/MoneyText'
import { Skeleton } from '@/components/ui/skeleton'
import { useInvoicePreview } from '@/hooks/useInvoicePreview'
import { getApiErrorInfo } from '@/lib/apiError'
import { cn } from '@/lib/utils'
import type { PeriodicInvoiceRequest } from '@/types/invoiceTypes'
import { formatMeterIndex } from '@/utils/formatMeterIndex'

interface InvoicePreviewCardProps {
  contractId: number
  /** Body xem trước từ `getPreviewRequest`; `null` khi form chưa đủ để tính. */
  request: PeriodicInvoiceRequest | null
}

/**
 * Khối **Tạm tính hóa đơn** ở L7 (docs/frontend-screens.md mục 6): mọi số do server tính qua
 * `POST /contracts/{id}/invoices/preview`, không lưu. `409`, `422` hiện `detail` ngay trong khối — Chủ trọ sửa ô
 * nhập là khối tự tính lại. Hóa đơn chỉ được tạo khi bấm Lưu nháp.
 */
export default function InvoicePreviewCard({ contractId, request }: InvoicePreviewCardProps) {
  const preview = useInvoicePreview(contractId, request)
  const data = preview.hasRequest ? preview.data : undefined
  const isUpdating = preview.isWaiting || preview.isFetching

  return (
    <section
      aria-labelledby="invoice-preview-title"
      aria-busy={isUpdating}
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6"
    >
      <h2 id="invoice-preview-title" className="text-lg font-bold">
        Tạm tính hóa đơn
      </h2>

      {!preview.hasRequest ? (
        <p className="text-sm text-muted-foreground">Nhập đủ chỉ số điện và nước để xem tổng tiền tạm tính.</p>
      ) : preview.isError && !preview.isWaiting ? (
        <p role="alert" className="text-sm text-destructive">
          {getApiErrorInfo(preview.error).message}
        </p>
      ) : !data ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-7 w-1/2" />
        </div>
      ) : (
        <div className={cn('flex flex-col gap-3 transition-opacity', isUpdating && 'opacity-60')}>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">
              Tiền phòng
              {data.daysCharged < data.daysInMonth && ` (${data.daysCharged}/${data.daysInMonth} ngày)`}
            </dt>
            <dd className="text-right">
              <MoneyText amount={data.rentAmount} />
            </dd>

            {data.serviceFees.length > 0 && (
              <>
                <dt className="text-muted-foreground">Phí dịch vụ</dt>
                <dd className="text-right">
                  <MoneyText amount={data.serviceFeeAmount} />
                </dd>
              </>
            )}

            <dt className="text-muted-foreground">
              Điện {formatMeterIndex(data.currentElectricityIndex - data.previousElectricityIndex)} kWh
            </dt>
            <dd className="text-right">
              <MoneyText amount={data.electricityAmount} />
            </dd>

            <dt className="text-muted-foreground">
              Nước {formatMeterIndex(data.currentWaterIndex - data.previousWaterIndex)} m³
            </dt>
            <dd className="text-right">
              <MoneyText amount={data.waterAmount} />
            </dd>

            {data.adjustmentAmount !== 0 && (
              <>
                <dt className="text-muted-foreground">Điều chỉnh</dt>
                <dd className="text-right">
                  <MoneyText amount={data.adjustmentAmount} />
                </dd>
              </>
            )}
          </dl>

          <div className="flex items-baseline justify-between gap-4 border-t pt-3">
            <span className="font-semibold">Tổng tạm tính</span>
            <MoneyText amount={data.totalAmount} className="text-xl font-bold" />
          </div>
          <p className="text-sm text-muted-foreground">Bấm Lưu nháp để lưu hóa đơn; người thuê chưa thấy cho tới khi bạn Phát hành.</p>
        </div>
      )}
    </section>
  )
}
