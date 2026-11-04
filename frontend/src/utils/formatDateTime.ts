const vietnamDateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/**
 * Hiện thời điểm dạng `dd/mm/yyyy HH:mm` theo giờ Việt Nam, cho chỗ cần biết cả giờ như nhật ký.
 * Giá trị không đọc được thì trả chuỗi rỗng, giống `formatDate`.
 */
export function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const parts = vietnamDateTimeFormat.formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}`
}
