// `signDisplay: 'negative'` bỏ dấu trừ của số âm làm tròn về 0, tránh hiện "-0 ₫".
const vndNumberFormat = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 0,
  signDisplay: 'negative',
})

/**
 * Hiện số tiền đồng, ví dụ `1645161` → "1.645.161 ₫" (docs/frontend-screens.md mục 1).
 * Dùng dấu cách không ngắt dòng để ký hiệu ₫ không rơi xuống dòng riêng.
 */
export function formatCurrency(amount: number): string {
  return `${vndNumberFormat.format(amount)} ₫`
}
