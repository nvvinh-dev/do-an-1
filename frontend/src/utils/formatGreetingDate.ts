const weekdayFormat = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long' })
const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/**
 * Ngày hôm nay theo giờ Việt Nam cho dòng đầu lời chào ở dashboard, dạng "Thứ Sáu, 20/11/2026"
 * (docs/design-system.md mục 5).
 */
export function formatGreetingDate(now: Date = new Date()): string {
  const weekday = weekdayFormat.format(now)
  // ICU có bản ghi "thứ sáu" chữ thường; viết hoa chữ đầu mỗi từ cho đúng cách ghi thứ trên lịch.
  const capitalized = weekday.replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase('vi-VN'))
  return `${capitalized}, ${dateFormat.format(now)}`
}
