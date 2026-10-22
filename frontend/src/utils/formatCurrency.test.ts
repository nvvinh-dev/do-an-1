import { describe, expect, it } from 'vitest'
import { formatCurrency } from '@/utils/formatCurrency'

const NBSP = ' '

describe('formatCurrency', () => {
  it('ngăn hàng nghìn bằng dấu chấm và thêm ký hiệu ₫', () => {
    expect(formatCurrency(1645161)).toBe(`1.645.161${NBSP}₫`)
  })

  it('hiện số nhỏ và số 0', () => {
    expect(formatCurrency(0)).toBe(`0${NBSP}₫`)
    expect(formatCurrency(500)).toBe(`500${NBSP}₫`)
    expect(formatCurrency(1000)).toBe(`1.000${NBSP}₫`)
  })

  it('giữ dấu trừ của số âm (số dư thanh lý Chủ trọ phải hoàn)', () => {
    expect(formatCurrency(-2500000)).toBe(`-2.500.000${NBSP}₫`)
  })

  it('không hiện -0 khi số âm nhỏ làm tròn về 0', () => {
    expect(formatCurrency(-0.4)).toBe(`0${NBSP}₫`)
    expect(formatCurrency(-0)).toBe(`0${NBSP}₫`)
  })

  it('làm tròn phần lẻ đến đồng', () => {
    expect(formatCurrency(1234.6)).toBe(`1.235${NBSP}₫`)
  })
})
