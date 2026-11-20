const shortNumberFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

/**
 * Giá thuê rút gọn kiểu tin cho thuê trọ ("3,5 triệu", "3,45 triệu", "950 nghìn") cho viên giá trên ảnh
 * thẻ phòng ở P1 (docs/design-system.md mục 11). Giữ tới 2 chữ số thập phân để 3.450.000 không bị đọc
 * thành 3,5 triệu; giá đầy đủ vẫn hiện bằng `MoneyText` cho trình đọc màn hình.
 */
export function formatRentPriceShort(amount: number): string {
  if (amount >= 1_000_000_000) return `${shortNumberFormat.format(amount / 1_000_000_000)} tỷ`
  if (amount >= 1_000_000) return `${shortNumberFormat.format(amount / 1_000_000)} triệu`
  if (amount >= 1_000) return `${shortNumberFormat.format(amount / 1_000)} nghìn`
  return `${shortNumberFormat.format(amount)} đ`
}
