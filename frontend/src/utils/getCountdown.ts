const MS_PER_HOUR = 60 * 60 * 1000

/** Còn dưới số giờ này thì chữ chuyển màu `warning` (docs/design-system.md mục 6.2). */
const URGENT_BELOW_HOURS = 24

interface Countdown {
  text: string
  /** Còn dưới 24 giờ, hoặc đã hết hạn. */
  isUrgent: boolean
}

/**
 * Đếm ngược tới một hạn có mốc giờ (`expiresAt`, `holdExpiresAt`), hiện dạng "còn X giờ"
 * (docs/frontend-screens.md mục 1). Số giờ làm tròn xuống: còn 23 giờ 59 phút hiện "còn 23 giờ",
 * khớp với việc chữ đã chuyển sang màu cảnh báo vì dưới 24 giờ. Đây chỉ là hiển thị; việc hết
 * hạn thật do endpoint tự kiểm tra (architecture mục 7).
 */
export function getCountdown(expiresAt: string | Date, now: Date = new Date()): Countdown {
  const remainingMs = new Date(expiresAt).getTime() - now.getTime()

  if (Number.isNaN(remainingMs)) {
    return { text: '', isUrgent: false }
  }
  if (remainingMs <= 0) {
    return { text: 'Đã hết hạn', isUrgent: true }
  }

  const hours = Math.floor(remainingMs / MS_PER_HOUR)
  return {
    text: hours < 1 ? 'còn dưới 1 giờ' : `còn ${hours} giờ`,
    isUrgent: remainingMs < URGENT_BELOW_HOURS * MS_PER_HOUR,
  }
}
