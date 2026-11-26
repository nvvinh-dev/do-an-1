/** Chỉ số dạng chuỗi đã chuẩn hóa (`1330` hoặc `89.5`, tối đa 2 số lẻ) đổi sang phần trăm đơn vị, số nguyên. */
function toHundredths(value: string): bigint {
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
}

/**
 * Tiền điện hoặc nước tạm tính ở L7 = (chỉ số mới − chỉ số cũ) × đơn giá, làm tròn đến đồng, nửa đồng
 * làm tròn lên — cùng công thức `InvoiceCalculator.MeterAmount` ở backend (BR-14). Chỉ để hiển thị:
 * không gửi lên server, số trên hóa đơn vẫn do server tính (docs/frontend-screens.md mục 1).
 * Tính bằng số nguyên phần trăm đơn vị để không lệch vì số thực (`89 − 84,5`).
 *
 * @param previous Chỉ số cũ do server trả.
 * @param current Chỉ số mới đã qua `normalizeMeterIndex` và `validateMeterIndex`.
 * @param unitPrice Đơn giá theo hợp đồng, số đồng nguyên.
 * @returns `null` khi chỉ số mới nhỏ hơn chỉ số cũ.
 */
export function estimateMeterAmount(previous: number, current: string, unitPrice: number): number | null {
  const used = toHundredths(current) - BigInt(Math.round(previous * 100))
  if (used < 0n) return null

  const amountTimes100 = used * BigInt(unitPrice)
  return Number((amountTimes100 + 50n) / 100n)
}
