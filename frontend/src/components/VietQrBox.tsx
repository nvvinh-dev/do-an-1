import { create } from 'qrcode'
import { useMemo } from 'react'
import MoneyText from '@/components/MoneyText'
import { cn } from '@/lib/utils'
import type { PaymentQr } from '@/types/paymentTypes'
import { buildVietQrPayload } from '@/utils/buildVietQrPayload'
import { formatCurrency } from '@/utils/formatCurrency'

/** Lề trắng quanh mã, tính bằng số ô; chuẩn QR yêu cầu tối thiểu 4 ô để máy quét nhận ra mã. */
const QUIET_ZONE_MODULES = 4

interface VietQrBoxProps {
  /** Trường `paymentQr` của hợp đồng hoặc hóa đơn; `null` thì không hiện khung (FR-80). */
  paymentQr: PaymentQr | null
  className?: string
}

/**
 * Mã VietQR để Người thuê chuyển khoản (BR-26), kèm số tiền, nội dung chuyển khoản và tài khoản nhận
 * để đối chiếu với ứng dụng ngân hàng. Mã vẽ ngay trong trình duyệt bằng `qrcode`, không gọi dịch vụ
 * tạo ảnh QR bên ngoài (security-design mục 5.4). Dùng ở T4 cho tiền cọc và T5 cho hóa đơn.
 */
export default function VietQrBox({ paymentQr, className }: VietQrBoxProps) {
  if (!paymentQr) {
    return null
  }
  return <VietQrBoxContent paymentQr={paymentQr} className={className} />
}

function VietQrBoxContent({ paymentQr, className }: { paymentQr: PaymentQr; className?: string }) {
  const qrImage = useMemo(() => drawQrImage(paymentQr), [paymentQr])

  return (
    <section
      className={cn(
        'flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6',
        className,
      )}
    >
      <h2 className="text-lg font-medium">Chuyển khoản bằng mã VietQR</h2>

      <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-6">
        {qrImage ? (
          <svg
            viewBox={`0 0 ${qrImage.size} ${qrImage.size}`}
            role="img"
            aria-label={`Mã VietQR chuyển ${formatCurrency(paymentQr.amount)}, nội dung ${paymentQr.transferContent}`}
            shapeRendering="crispEdges"
            className="aspect-square w-full max-w-60 shrink-0 rounded-lg border bg-background text-foreground"
          >
            <path d={qrImage.path} fill="currentColor" />
          </svg>
        ) : (
          <p className="text-sm text-destructive">
            Không vẽ được mã VietQR từ thông tin này. Chuyển khoản theo số tài khoản, số tiền và nội dung bên dưới.
          </p>
        )}

        <div className="flex w-full flex-col gap-4 text-sm">
          <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[10rem_1fr] sm:gap-y-3">
            <dt className="text-muted-foreground">Số tiền</dt>
            <dd>
              <MoneyText amount={paymentQr.amount} className="text-base font-semibold" />
            </dd>

            <dt className="text-muted-foreground">Nội dung chuyển khoản</dt>
            <dd className="font-medium wrap-anywhere">{paymentQr.transferContent}</dd>

            <dt className="text-muted-foreground">Số tài khoản</dt>
            <dd className="tabular-nums wrap-anywhere">{paymentQr.accountNumber}</dd>

            <dt className="text-muted-foreground">Chủ tài khoản</dt>
            <dd className="wrap-anywhere">{paymentQr.accountName}</dd>
          </dl>

          <p>
            Quét mã bằng ứng dụng ngân hàng: số tài khoản, số tiền và nội dung đã điền sẵn. Kiểm tra tên người nhận
            trong ứng dụng trùng với chủ tài khoản ở trên, giữ nguyên nội dung để Chủ trọ đối chiếu.
          </p>
          <p className="text-muted-foreground">
            Đang xem trên điện thoại thì chụp màn hình, rồi chọn ảnh đó trong mục quét mã của ứng dụng ngân hàng.
          </p>
        </div>
      </div>
    </section>
  )
}

interface QrImage {
  /** Số ô mỗi cạnh, kể cả lề trắng. */
  size: number
  /** Đường vẽ các ô tối, mỗi ô là một hình vuông 1×1. */
  path: string
}

/**
 * Mã QR dạng hình vẽ SVG từ chuỗi VietQR. Dựng bằng phần tử React, không chèn chuỗi HTML hay SVG
 * vào trang. Dữ liệu không dựng được chuỗi VietQR (trường quá dài) thì trả `null`.
 */
function drawQrImage(paymentQr: PaymentQr): QrImage | null {
  let modules
  try {
    // Mức sửa lỗi M: mã không quá dày ô, vẫn quét được khi ảnh chụp màn hình hơi mờ.
    modules = create(buildVietQrPayload(paymentQr), { errorCorrectionLevel: 'M' }).modules
  } catch {
    return null
  }

  let path = ''
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) {
      if (modules.get(row, col)) {
        path += `M${col + QUIET_ZONE_MODULES} ${row + QUIET_ZONE_MODULES}h1v1h-1z`
      }
    }
  }
  return { size: modules.size + 2 * QUIET_ZONE_MODULES, path }
}
