import { describe, expect, it } from 'vitest'
import { groupNotificationsByDay } from './groupNotificationsByDay'

// 21/11/2026 00:10 giờ Việt Nam = 20/11 17:10 UTC.
const NOW = new Date('2026-11-20T17:10:00Z')

const at = (iso: string, id = 1) => ({ id, createdAt: iso })

describe('groupNotificationsByDay', () => {
  it('thông báo lúc 23:30 ngày 20/11 giờ Việt Nam thuộc "Hôm qua" khi xem lúc 00:10 ngày 21/11', () => {
    // 23:30 ngày 20/11 giờ Việt Nam = 16:30 UTC cùng ngày.
    const groups = groupNotificationsByDay([at('2026-11-20T16:30:00Z')], NOW)
    expect(groups.map((group) => group.key)).toEqual(['yesterday'])
  })

  it('thông báo lúc 00:05 ngày 21/11 giờ Việt Nam là "Hôm nay" dù UTC vẫn là ngày 20/11', () => {
    const groups = groupNotificationsByDay([at('2026-11-20T17:05:00Z')], NOW)
    expect(groups.map((group) => group.key)).toEqual(['today'])
  })

  it('chia ba nhóm, giữ thứ tự đầu vào và bỏ nhóm rỗng', () => {
    const groups = groupNotificationsByDay(
      [at('2026-11-20T17:05:00Z', 1), at('2026-11-20T10:00:00Z', 2), at('2026-11-18T10:00:00Z', 3), at('2026-11-10T10:00:00Z', 4)],
      NOW,
    )
    expect(groups.map((group) => [group.label, group.items.map((item) => item.id)])).toEqual([
      ['Hôm nay', [1]],
      ['Hôm qua', [2]],
      ['Trước đó', [3, 4]],
    ])
  })

  it('không có thông báo hôm nay thì không có nhóm "Hôm nay"', () => {
    const groups = groupNotificationsByDay([at('2026-11-01T10:00:00Z')], NOW)
    expect(groups.map((group) => group.key)).toEqual(['earlier'])
  })

  it('qua ranh giới tháng: hôm qua của 01/12 là 30/11', () => {
    const now = new Date('2026-12-01T05:00:00Z') // 12:00 ngày 01/12 giờ Việt Nam
    const groups = groupNotificationsByDay([at('2026-11-30T05:00:00Z')], now)
    expect(groups.map((group) => group.key)).toEqual(['yesterday'])
  })

  it('danh sách rỗng thì không có nhóm nào', () => {
    expect(groupNotificationsByDay([], NOW)).toEqual([])
  })
})
