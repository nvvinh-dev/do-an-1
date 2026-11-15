import { describe, expect, it } from 'vitest'
import { formatCompactCurrency } from '@/utils/formatCompactCurrency'

const NBSP = ' '

describe('formatCompactCurrency', () => {
  it('rút gọn theo triệu, giữ một chữ số lẻ', () => {
    expect(formatCompactCurrency(5300000)).toBe(`5,3${NBSP}tr`)
    expect(formatCompactCurrency(12500000)).toBe(`12,5${NBSP}tr`)
    expect(formatCompactCurrency(2000000)).toBe(`2${NBSP}tr`)
  })

  it('làm tròn chữ số lẻ thứ hai', () => {
    expect(formatCompactCurrency(7150000)).toBe(`7,2${NBSP}tr`)
    expect(formatCompactCurrency(2940000)).toBe(`2,9${NBSP}tr`)
  })

  it('dưới một triệu thì rút gọn theo nghìn', () => {
    expect(formatCompactCurrency(950000)).toBe(`950${NBSP}k`)
    expect(formatCompactCurrency(1500)).toBe(`1,5${NBSP}k`)
  })

  it('làm tròn lên đủ một đơn vị thì chuyển sang đơn vị lớn hơn', () => {
    expect(formatCompactCurrency(999960)).toBe(`1${NBSP}tr`)
    expect(formatCompactCurrency(999960000)).toBe(`1${NBSP}tỷ`)
  })

  it('từ một tỷ thì rút gọn theo tỷ, ngăn hàng nghìn bằng dấu chấm', () => {
    expect(formatCompactCurrency(1250000000)).toBe(`1,3${NBSP}tỷ`)
    expect(formatCompactCurrency(1500000000000)).toBe(`1.500${NBSP}tỷ`)
  })

  it('số dưới một nghìn và số 0 giữ nguyên', () => {
    expect(formatCompactCurrency(0)).toBe('0')
    expect(formatCompactCurrency(500)).toBe('500')
  })
})
