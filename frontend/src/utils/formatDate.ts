const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh'

// Ngày thuần (`DateOnly` của backend, ví dụ ngày bắt đầu hợp đồng) không có giờ nên không đổi múi giờ.
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const vietnamDateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: VIETNAM_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/**
 * Hiện ngày dạng `dd/mm/yyyy` theo giờ Việt Nam (docs/frontend-screens.md mục 1). Nhận ngày thuần
 * ("2026-10-22") hoặc thời điểm UTC ("2026-10-22T17:30:00Z" → 23/10/2026 vì đã sang ngày mới ở Việt Nam).
 * Giá trị không đọc được thì trả chuỗi rỗng, để một ô dữ liệu lỗi không làm sập cả trang.
 */
export function formatDate(value: string | Date): string {
  if (typeof value === 'string') {
    const dateOnly = DATE_ONLY_PATTERN.exec(value)
    if (dateOnly) {
      const [, year, month, day] = dateOnly
      return `${day}/${month}/${year}`
    }
  }

  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const parts = vietnamDateFormat.formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  return `${part('day')}/${part('month')}/${part('year')}`
}
