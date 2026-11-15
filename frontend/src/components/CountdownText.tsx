import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { getCountdown } from '@/utils/getCountdown'

// Số giờ chỉ đổi mỗi giờ, nên cập nhật mỗi phút là đủ để chữ đổi đúng lúc mà không vẽ lại liên tục.
const REFRESH_INTERVAL_MS = 60_000

interface CountdownTextProps {
  /** Hạn có mốc giờ do API trả về: `expiresAt` hoặc `holdExpiresAt` (ISO 8601). */
  expiresAt: string
  className?: string
}

/** "còn X giờ" tới hạn; còn dưới 24 giờ thì chữ màu `warning` (docs/design-system.md mục 6.2). */
export default function CountdownText({ expiresAt, className }: CountdownTextProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  const { text, isUrgent } = getCountdown(expiresAt, now)

  return (
    <time dateTime={expiresAt} className={cn('tabular-nums', isUrgent && 'text-warning', className)}>
      {text}
    </time>
  )
}
