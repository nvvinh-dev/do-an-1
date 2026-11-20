import { describe, expect, it } from 'vitest'
import { getOccupancyPercent } from './getOccupancyPercent'

describe('getOccupancyPercent', () => {
  it('làm tròn tới số nguyên phần trăm', () => {
    expect(getOccupancyPercent(15, 24)).toBe(63) // 62,5%
    expect(getOccupancyPercent(18, 24)).toBe(75)
    expect(getOccupancyPercent(1, 3)).toBe(33)
  })

  it('đủ phòng đang thuê là 100, không phòng nào là 0', () => {
    expect(getOccupancyPercent(8, 8)).toBe(100)
    expect(getOccupancyPercent(0, 8)).toBe(0)
  })

  it('chưa có phòng thì không có tỷ lệ', () => {
    expect(getOccupancyPercent(0, 0)).toBeNull()
  })
})
