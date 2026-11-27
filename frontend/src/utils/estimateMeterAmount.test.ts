import { describe, expect, it } from 'vitest'
import { estimateMeterAmount } from '@/utils/estimateMeterAmount'

describe('estimateMeterAmount', () => {
  it('điện dùng 80 kWh × 3.500 đ = 280.000 đ', () => {
    expect(estimateMeterAmount(1250, '1330', 3500)).toBe(280000)
  })

  it('nước có số lẻ không lệch vì số thực: 84,5 → 89 m³ × 15.000 đ = 67.500 đ', () => {
    expect(estimateMeterAmount(84.5, '89', 15000)).toBe(67500)
  })

  it('làm tròn đến đồng, nửa đồng làm tròn lên: 0,01 kWh × 3.550 đ = 35,5 đ → 36 đ', () => {
    expect(estimateMeterAmount(100, '100.01', 3550)).toBe(36)
  })

  it('dưới nửa đồng thì làm tròn xuống: 0,01 kWh × 3.540 đ = 35,4 đ → 35 đ', () => {
    expect(estimateMeterAmount(100, '100.01', 3540)).toBe(35)
  })

  it('chỉ số cũ có 2 số lẻ: 1.180,25 → 1.200,5 kWh × 3.500 đ = 70.875 đ', () => {
    expect(estimateMeterAmount(1180.25, '1200.5', 3500)).toBe(70875)
  })

  it('không dùng thì 0 đ', () => {
    expect(estimateMeterAmount(500, '500', 3500)).toBe(0)
  })

  it('chỉ số mới nhỏ hơn chỉ số cũ thì không tính', () => {
    expect(estimateMeterAmount(500, '499.99', 3500)).toBeNull()
  })
})
