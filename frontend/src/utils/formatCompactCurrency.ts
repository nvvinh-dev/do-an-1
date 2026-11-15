const compactNumberFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

// Từ đơn vị nhỏ tới lớn; số dưới một nghìn hiện nguyên.
const UNITS = [
  { value: 1_000, label: 'k' },
  { value: 1_000_000, label: 'tr' },
  { value: 1_000_000_000, label: 'tỷ' },
] as const

/**
 * Số tiền rút gọn cho chỗ quá hẹp để ghi đủ, ví dụ `5300000` → "5,3 tr" — chỉ dùng trên cột của
 * `RevenueBars` dưới `md` (docs/design-system.md mục 6.2). Mọi chỗ khác dùng `formatCurrency`.
 */
export function formatCompactCurrency(amount: number): string {
  let unitIndex = UNITS.findLastIndex((unit) => Math.abs(amount) >= unit.value)
  if (unitIndex === -1) {
    return compactNumberFormat.format(Math.round(amount))
  }

  let rounded = roundToTenth(amount / UNITS[unitIndex].value)
  // 999.960 làm tròn thành 1.000 k thì ghi "1 tr".
  if (Math.abs(rounded) >= 1000 && unitIndex < UNITS.length - 1) {
    unitIndex += 1
    rounded = roundToTenth(amount / UNITS[unitIndex].value)
  }
  return `${compactNumberFormat.format(rounded)} ${UNITS[unitIndex].label}`
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10
}
