import { CircleAlert } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { getApiErrorInfo } from '@/lib/apiError'
import { cn } from '@/lib/utils'

interface ApiErrorAlertProps {
  /** Lỗi của `useQuery` / `useMutation`; `null` hoặc `undefined` thì không hiện gì. */
  error: unknown
  /** Có truyền thì hiện nút "Thử lại" cho lỗi mạng và lỗi 5xx. */
  onRetry?: () => void
  className?: string
  /** Xem `getApiErrorInfo` ở `lib/apiError.ts`: chỉ bật cho endpoint biết chắc `detail` của `400` là câu tiếng Việt cố định. */
  trust400Detail?: boolean
}

/**
 * Hiện lỗi trả về từ API, đặt ở đầu form hoặc ngay trên nút vừa bấm (docs/design-system.md
 * mục 6.2). Component chỉ hiển thị, không đụng tới form, nên dữ liệu người dùng đã nhập vẫn còn.
 */
export default function ApiErrorAlert({ error, onRetry, className, trust400Detail }: ApiErrorAlertProps) {
  if (error == null) {
    return null
  }

  const { message, retryAfterSeconds, canRetry } = getApiErrorInfo(error, { trust400Detail })

  return (
    <Alert variant="destructive" className={cn('border-destructive/40', className)}>
      <CircleAlert />
      <AlertDescription className="flex flex-col items-start gap-2">
        <p>{message}</p>
        {retryAfterSeconds !== null && retryAfterSeconds > 0 && (
          <p>Thời gian chờ: {formatWaitTime(retryAfterSeconds)}.</p>
        )}
        {canRetry && onRetry && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Thử lại
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

/** 75 → "1 phút 15 giây", 3600 → "60 phút". */
function formatWaitTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) {
    return `${seconds} giây`
  }
  return seconds === 0 ? `${minutes} phút` : `${minutes} phút ${seconds} giây`
}
