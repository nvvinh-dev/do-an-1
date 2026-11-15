/** Tháng `yyyy-MM` của API thành dạng `mm/yyyy`, ví dụ "2026-10" → "10/2026". */
export function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-')
  return `${monthNumber}/${year}`
}

/** Nhãn ngắn dưới cột biểu đồ, ví dụ "2026-10" → "T10", "2026-01" → "T1". */
export function formatMonthShort(month: string): string {
  return `T${Number(month.split('-')[1])}`
}
