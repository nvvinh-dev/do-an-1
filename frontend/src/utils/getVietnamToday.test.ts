import { describe, expect, it } from 'vitest'
import { getVietnamToday } from '@/utils/getVietnamToday'

describe('getVietnamToday', () => {
  it('trả ngày dạng YYYY-MM-DD', () => {
    expect(getVietnamToday(new Date('2026-10-28T05:00:00Z'))).toBe('2026-10-28')
    expect(getVietnamToday(new Date('2026-01-05T05:00:00Z'))).toBe('2026-01-05')
  })

  it('đã sang ngày mới ở Việt Nam dù UTC vẫn là ngày hôm trước', () => {
    // 16:59 UTC = 23:59 cùng ngày ở Việt Nam; 17:00 UTC = 0 giờ ngày hôm sau.
    expect(getVietnamToday(new Date('2026-10-27T16:59:59Z'))).toBe('2026-10-27')
    expect(getVietnamToday(new Date('2026-10-27T17:00:00Z'))).toBe('2026-10-28')
  })

  it('qua mốc năm theo giờ Việt Nam', () => {
    expect(getVietnamToday(new Date('2026-12-31T18:00:00Z'))).toBe('2027-01-01')
  })
})
