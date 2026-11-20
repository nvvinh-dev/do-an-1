import { describe, expect, it } from 'vitest'
import { formatRentPriceShort } from './formatRentPriceShort'

describe('formatRentPriceShort', () => {
  it('ghi theo triệu, bỏ số 0 thừa', () => {
    expect(formatRentPriceShort(3_500_000)).toBe('3,5 triệu')
    expect(formatRentPriceShort(3_000_000)).toBe('3 triệu')
  })

  it('giữ 2 chữ số thập phân để giá lẻ không bị làm tròn lên', () => {
    expect(formatRentPriceShort(3_450_000)).toBe('3,45 triệu')
    expect(formatRentPriceShort(2_999_000)).toBe('3 triệu')
  })

  it('dưới một triệu ghi theo nghìn', () => {
    expect(formatRentPriceShort(950_000)).toBe('950 nghìn')
  })

  it('dưới một nghìn ghi số đồng', () => {
    expect(formatRentPriceShort(500)).toBe('500 đ')
  })

  it('từ một tỷ ghi theo tỷ, dấu chấm phân cách hàng nghìn kiểu Việt Nam', () => {
    expect(formatRentPriceShort(1_250_000_000)).toBe('1,25 tỷ')
    expect(formatRentPriceShort(12_500_000)).toBe('12,5 triệu')
  })
})
