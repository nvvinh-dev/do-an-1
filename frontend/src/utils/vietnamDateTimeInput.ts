const vietnamDateTimeFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/**
 * Thời điểm theo giờ Việt Nam dạng `YYYY-MM-DDTHH:mm`, giá trị của ô `datetime-local` (ngày nhận cọc,
 * ngày hoàn cọc). Không phụ thuộc múi giờ của máy người dùng.
 */
export function toVietnamDateTimeInput(date: Date): string {
  const parts = Object.fromEntries(vietnamDateTimeFormat.formatToParts(date).map((part) => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

/**
 * Giá trị ô `datetime-local` (giờ Việt Nam) đổi sang ISO 8601 kèm `+07:00` để server đổi về UTC
 * (architecture mục 7.1). Chuỗi sai dạng trả `null`.
 */
export function vietnamDateTimeInputToIso(value: string): string | null {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00+07:00` : null
}
