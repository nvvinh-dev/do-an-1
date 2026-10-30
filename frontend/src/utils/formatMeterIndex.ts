// Chỉ số điện nước lưu `numeric(12,2)`: hiện tối đa 2 chữ số thập phân, bỏ số 0 thừa.
const meterIndexFormat = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 2,
})

/** Hiện chỉ số đồng hồ điện nước theo cách viết số của Việt Nam, ví dụ `1182.5` → "1.182,5". */
export function formatMeterIndex(value: number): string {
  return meterIndexFormat.format(value)
}
