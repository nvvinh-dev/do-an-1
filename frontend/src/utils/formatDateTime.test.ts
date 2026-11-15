import { describe, expect, it } from 'vitest'
import { formatDateTime } from '@/utils/formatDateTime'

describe('formatDateTime', () => {
  it('đổi thời điểm UTC sang giờ Việt Nam', () => {
    expect(formatDateTime('2026-11-04T03:05:00Z')).toBe('04/11/2026 10:05')
  })

  it('qua ngày mới theo giờ Việt Nam và hiện 0 giờ là 00', () => {
    expect(formatDateTime('2026-10-22T17:00:00Z')).toBe('23/10/2026 00:00')
  })

  it('trả chuỗi rỗng khi giá trị không đọc được', () => {
    expect(formatDateTime('không phải thời điểm')).toBe('')
  })
})
