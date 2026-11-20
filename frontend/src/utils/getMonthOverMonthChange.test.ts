import { describe, expect, it } from 'vitest'
import { formatPercentChange, getMonthOverMonthChange } from './getMonthOverMonthChange'

describe('getMonthOverMonthChange', () => {
  it('tính phần trăm tăng, làm tròn 1 chữ số thập phân', () => {
    // 46.900.000 so với 44.600.000: tăng 5,157...%
    expect(getMonthOverMonthChange(46_900_000, 44_600_000)).toBe(5.2)
  })

  it('giảm thì ra số âm, nửa làm tròn ra xa số 0', () => {
    expect(getMonthOverMonthChange(3_000_000, 4_000_000)).toBe(-25)
    // 1.000.000 → 999.500: giảm 0,05% → -0,1
    expect(getMonthOverMonthChange(999_500, 1_000_000)).toBe(-0.1)
  })

  it('bằng nhau là 0', () => {
    expect(getMonthOverMonthChange(5_000_000, 5_000_000)).toBe(0)
  })

  it('tháng trước bằng 0 thì không so được', () => {
    expect(getMonthOverMonthChange(5_000_000, 0)).toBeNull()
  })
})

describe('formatPercentChange', () => {
  it('ghi dấu cộng khi tăng, dấu phẩy thập phân kiểu Việt Nam', () => {
    expect(formatPercentChange(5.2)).toBe('+5,2%')
    expect(formatPercentChange(-25)).toBe('-25%')
    expect(formatPercentChange(0)).toBe('0%')
  })
})
