import { describe, expect, it } from 'vitest'
import { getSettlementBalance } from '@/utils/getSettlementBalance'

describe('getSettlementBalance', () => {
  it('số dư dương: Người thuê còn phải trả', () => {
    expect(getSettlementBalance(1200000)).toEqual({ label: 'Người thuê còn phải trả', amount: 1200000 })
  })

  it('số dư âm: Chủ trọ phải hoàn, số tiền hiện dạng dương', () => {
    expect(getSettlementBalance(-2500000)).toEqual({ label: 'Chủ trọ phải hoàn', amount: 2500000 })
  })

  it('số dư bằng 0: không có chiều', () => {
    expect(getSettlementBalance(0)).toEqual({ label: null, amount: 0 })
    expect(getSettlementBalance(-0)).toEqual({ label: null, amount: 0 })
  })
})
