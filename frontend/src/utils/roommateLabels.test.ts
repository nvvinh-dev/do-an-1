import { describe, expect, it } from 'vitest'
import { formatCriterionScore, MATCH_CRITERIA } from '@/utils/roommateLabels'

describe('formatCriterionScore', () => {
  it('đổi điểm 0 tới 1 thành phần trăm nguyên', () => {
    expect(formatCriterionScore(1)).toBe('100%')
    expect(formatCriterionScore(0.5)).toBe('50%')
    expect(formatCriterionScore(0)).toBe('0%')
    expect(formatCriterionScore(0.8333)).toBe('83%')
  })

  it('giữ trong khoảng 0% tới 100% khi giá trị lạ', () => {
    expect(formatCriterionScore(1.2)).toBe('100%')
    expect(formatCriterionScore(-0.1)).toBe('0%')
  })
})

describe('MATCH_CRITERIA', () => {
  it('trọng số cộng lại đủ 100 như FR-113', () => {
    expect(MATCH_CRITERIA.reduce((sum, criterion) => sum + criterion.weight, 0)).toBe(100)
  })
})
