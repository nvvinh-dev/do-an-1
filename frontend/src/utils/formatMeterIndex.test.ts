import { describe, expect, it } from 'vitest'
import { formatMeterIndex } from '@/utils/formatMeterIndex'

describe('formatMeterIndex', () => {
  it('số nguyên hiện dấu chấm phân cách hàng nghìn, không có phần thập phân', () => {
    expect(formatMeterIndex(1180)).toBe('1.180')
    expect(formatMeterIndex(0)).toBe('0')
  })

  it('phần thập phân dùng dấu phẩy, tối đa 2 chữ số như cột numeric(12,2)', () => {
    expect(formatMeterIndex(1182.5)).toBe('1.182,5')
    expect(formatMeterIndex(76.25)).toBe('76,25')
  })
})
