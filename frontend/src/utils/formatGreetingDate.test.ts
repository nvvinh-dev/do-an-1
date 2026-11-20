import { describe, expect, it } from 'vitest'
import { formatGreetingDate } from './formatGreetingDate'

describe('formatGreetingDate', () => {
  it('ghi thứ và ngày theo giờ Việt Nam', () => {
    // 20/11/2026 09:00 giờ Việt Nam
    expect(formatGreetingDate(new Date('2026-11-20T02:00:00Z'))).toBe('Thứ Sáu, 20/11/2026')
  })

  it('đã qua nửa đêm giờ Việt Nam thì sang ngày mới dù UTC vẫn là hôm trước', () => {
    // 22/11/2026 00:30 giờ Việt Nam là 21/11 17:30 UTC
    expect(formatGreetingDate(new Date('2026-11-21T17:30:00Z'))).toBe('Chủ Nhật, 22/11/2026')
  })
})
