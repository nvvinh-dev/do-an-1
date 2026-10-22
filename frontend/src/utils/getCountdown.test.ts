import { describe, expect, it } from 'vitest'
import { getCountdown } from '@/utils/getCountdown'

const NOW = new Date('2026-10-22T08:00:00Z')

describe('getCountdown', () => {
  it('hiện số giờ còn lại, không cảnh báo khi còn từ 24 giờ', () => {
    expect(getCountdown('2026-10-29T08:00:00Z', NOW)).toEqual({ text: 'còn 168 giờ', isUrgent: false })
    expect(getCountdown('2026-10-23T08:00:00Z', NOW)).toEqual({ text: 'còn 24 giờ', isUrgent: false })
  })

  it('làm tròn xuống và cảnh báo khi còn dưới 24 giờ', () => {
    expect(getCountdown('2026-10-23T07:59:00Z', NOW)).toEqual({ text: 'còn 23 giờ', isUrgent: true })
    expect(getCountdown('2026-10-22T14:30:00Z', NOW)).toEqual({ text: 'còn 6 giờ', isUrgent: true })
  })

  it('còn dưới 1 giờ', () => {
    expect(getCountdown('2026-10-22T08:45:00Z', NOW)).toEqual({ text: 'còn dưới 1 giờ', isUrgent: true })
  })

  it('đã hết hạn', () => {
    expect(getCountdown('2026-10-22T08:00:00Z', NOW)).toEqual({ text: 'Đã hết hạn', isUrgent: true })
    expect(getCountdown('2026-10-21T08:00:00Z', NOW)).toEqual({ text: 'Đã hết hạn', isUrgent: true })
  })

  it('giá trị không đọc được thì không hiện gì', () => {
    expect(getCountdown('không phải ngày', NOW)).toEqual({ text: '', isUrgent: false })
  })
})
