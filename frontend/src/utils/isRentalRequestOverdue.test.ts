import { describe, expect, it } from 'vitest'
import { isRentalRequestOverdue } from '@/utils/isRentalRequestOverdue'

const DEADLINE = '2026-10-29T03:00:00Z'
const AFTER_DEADLINE = new Date('2026-10-29T03:00:01Z')

describe('isRentalRequestOverdue', () => {
  it('ChoDuyet còn trước hạn duyệt thì chưa quá hạn', () => {
    expect(
      isRentalRequestOverdue({ expiresAt: DEADLINE, holdExpiresAt: null }, new Date('2026-10-29T02:59:59Z')),
    ).toBe(false)
  })

  it('ChoDuyet đúng mốc hạn duyệt thì chưa quá hạn, như backend', () => {
    expect(isRentalRequestOverdue({ expiresAt: DEADLINE, holdExpiresAt: null }, new Date(DEADLINE))).toBe(false)
  })

  it('ChoDuyet đã qua hạn duyệt 168 giờ thì quá hạn', () => {
    expect(isRentalRequestOverdue({ expiresAt: DEADLINE, holdExpiresAt: null }, AFTER_DEADLINE)).toBe(true)
  })

  it('DaDuyet còn trong hạn giữ chỗ thì chưa quá hạn', () => {
    expect(
      isRentalRequestOverdue({ expiresAt: null, holdExpiresAt: DEADLINE }, new Date('2026-10-29T02:59:59Z')),
    ).toBe(false)
  })

  it('DaDuyet đã qua hạn giữ chỗ 72 giờ thì quá hạn', () => {
    expect(isRentalRequestOverdue({ expiresAt: null, holdExpiresAt: DEADLINE }, AFTER_DEADLINE)).toBe(true)
  })

  it('trạng thái không có hạn (DaLapHopDong, TuChoi, DaHuy, HetHan) thì không quá hạn', () => {
    expect(isRentalRequestOverdue({ expiresAt: null, holdExpiresAt: null }, AFTER_DEADLINE)).toBe(false)
  })
})
