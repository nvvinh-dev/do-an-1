import { describe, expect, it } from 'vitest'
import { formatDate } from '@/utils/formatDate'

describe('formatDate', () => {
  it('đổi ngày thuần sang dd/mm/yyyy, không đổi múi giờ', () => {
    expect(formatDate('2026-10-22')).toBe('22/10/2026')
    expect(formatDate('2026-01-05')).toBe('05/01/2026')
  })

  it('đổi thời điểm UTC sang ngày theo giờ Việt Nam', () => {
    // 23:59 ngày 22/10 giờ Việt Nam = 16:59 UTC cùng ngày (hạn của thẻ Trello).
    expect(formatDate('2026-10-22T16:59:00.000Z')).toBe('22/10/2026')
    // 17:00 UTC đã là 0 giờ ngày hôm sau ở Việt Nam.
    expect(formatDate('2026-10-22T17:00:00Z')).toBe('23/10/2026')
  })

  it('qua mốc năm theo giờ Việt Nam', () => {
    expect(formatDate('2026-12-31T18:00:00Z')).toBe('01/01/2027')
  })

  it('nhận đối tượng Date', () => {
    expect(formatDate(new Date('2026-10-22T05:00:00Z'))).toBe('22/10/2026')
  })

  it('trả chuỗi rỗng khi giá trị không đọc được', () => {
    expect(formatDate('không phải ngày')).toBe('')
    expect(formatDate(new Date('x'))).toBe('')
  })
})
