import { describe, expect, it } from 'vitest'
import { formatMonth, formatMonthShort } from '@/utils/formatMonth'

describe('formatMonth', () => {
  it('đổi yyyy-MM thành mm/yyyy', () => {
    expect(formatMonth('2026-10')).toBe('10/2026')
    expect(formatMonth('2027-01')).toBe('01/2027')
  })
})

describe('formatMonthShort', () => {
  it('bỏ số 0 đầu của tháng', () => {
    expect(formatMonthShort('2026-10')).toBe('T10')
    expect(formatMonthShort('2027-01')).toBe('T1')
  })
})
