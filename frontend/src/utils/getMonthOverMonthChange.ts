/**
 * Mức thay đổi doanh thu tháng này so với tháng trước, tính bằng phần trăm và làm tròn 1 chữ số thập phân
 * (nửa làm tròn ra xa số 0), chỉ để hiển thị ở L1 (docs/frontend-screens.md mục 6). Tháng trước bằng 0
 * thì không so được, trả `null`.
 */
export function getMonthOverMonthChange(currentAmount: number, previousAmount: number): number | null {
  if (previousAmount <= 0) return null
  const percent = ((currentAmount - previousAmount) / previousAmount) * 100
  return (Math.sign(percent) * Math.round(Math.abs(percent) * 10)) / 10
}

const percentFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

/** "+5,2%", "-3%", "0%" — có dấu cộng khi tăng để đọc nhanh chiều thay đổi. */
export function formatPercentChange(change: number): string {
  const sign = change > 0 ? '+' : change < 0 ? '-' : ''
  return `${sign}${percentFormat.format(Math.abs(change))}%`
}
