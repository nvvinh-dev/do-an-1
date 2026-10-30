import { describe, expect, it } from 'vitest'
import { isHoldExpired } from '@/utils/isHoldExpired'

const HOLD_EXPIRES_AT = '2026-10-29T03:00:00Z'

describe('isHoldExpired', () => {
  it('không có hạn giữ chỗ thì không quá hạn', () => {
    expect(isHoldExpired(null, new Date('2026-10-29T03:00:01Z'))).toBe(false)
  })

  it('còn trước hạn thì chưa quá hạn', () => {
    expect(isHoldExpired(HOLD_EXPIRES_AT, new Date('2026-10-29T02:59:59Z'))).toBe(false)
  })

  it('đúng mốc hạn thì chưa quá hạn, như backend', () => {
    expect(isHoldExpired(HOLD_EXPIRES_AT, new Date(HOLD_EXPIRES_AT))).toBe(false)
  })

  it('đã qua mốc hạn thì quá hạn', () => {
    expect(isHoldExpired(HOLD_EXPIRES_AT, new Date('2026-10-29T03:00:01Z'))).toBe(true)
  })
})
