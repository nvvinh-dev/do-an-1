import { describe, expect, it } from 'vitest'
import { toVietnamDateTimeInput, vietnamDateTimeInputToIso } from '@/utils/vietnamDateTimeInput'

describe('toVietnamDateTimeInput', () => {
  it('đổi thời điểm UTC sang giờ Việt Nam', () => {
    expect(toVietnamDateTimeInput(new Date('2026-11-07T03:05:00Z'))).toBe('2026-11-07T10:05')
  })

  it('17:30 UTC đã là ngày hôm sau ở Việt Nam', () => {
    expect(toVietnamDateTimeInput(new Date('2026-11-07T17:30:00Z'))).toBe('2026-11-08T00:30')
  })
})

describe('vietnamDateTimeInputToIso', () => {
  it('gắn múi giờ +07:00', () => {
    expect(vietnamDateTimeInputToIso('2026-11-07T10:05')).toBe('2026-11-07T10:05:00+07:00')
  })

  it('chuỗi rỗng hoặc sai dạng trả null', () => {
    expect(vietnamDateTimeInputToIso('')).toBeNull()
    expect(vietnamDateTimeInputToIso('07/11/2026 10:05')).toBeNull()
  })
})
