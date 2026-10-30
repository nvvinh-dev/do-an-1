import { describe, expect, it } from 'vitest'
import type { ContractStatus } from '@/types/contractTypes'
import { getTenantContractActions } from '@/utils/getTenantContractActions'

const TODAY = '2026-10-29'
const NOW = new Date('2026-10-29T03:00:00Z')
const HOLD_NOT_EXPIRED = '2026-10-30T03:00:00Z'
const HOLD_EXPIRED = '2026-10-29T02:40:00Z'

function actionsOf(status: ContractStatus, startDate = '2026-11-01', holdExpiresAt: string | null = null) {
  return getTenantContractActions({ status, startDate, holdExpiresAt }, TODAY, NOW)
}

describe('getTenantContractActions', () => {
  it('Nhap: chỉ hủy được, chưa đồng ý hay yêu cầu sửa được', () => {
    expect(actionsOf('Nhap', undefined, HOLD_NOT_EXPIRED)).toEqual({
      canConfirm: false,
      canRequestChanges: false,
      canCancel: true,
    })
  })

  it('ChoNguoiThueXacNhan: đồng ý, yêu cầu sửa và hủy', () => {
    expect(actionsOf('ChoNguoiThueXacNhan', undefined, HOLD_NOT_EXPIRED)).toEqual({
      canConfirm: true,
      canRequestChanges: true,
      canCancel: true,
    })
  })

  it('ChoNhanCoc: chỉ hủy được', () => {
    expect(actionsOf('ChoNhanCoc', undefined, HOLD_NOT_EXPIRED)).toEqual({
      canConfirm: false,
      canRequestChanges: false,
      canCancel: true,
    })
  })

  it('ChoNguoiThueXacNhan quá hạn giữ chỗ mà chưa bị hủy: chỉ còn hủy', () => {
    expect(actionsOf('ChoNguoiThueXacNhan', undefined, HOLD_EXPIRED)).toEqual({
      canConfirm: false,
      canRequestChanges: false,
      canCancel: true,
    })
  })

  it.each<ContractStatus>(['Nhap', 'ChoNhanCoc'])('%s quá hạn giữ chỗ mà chưa bị hủy: vẫn hủy được', (status) => {
    expect(actionsOf(status, undefined, HOLD_EXPIRED).canCancel).toBe(true)
  })

  it('hợp đồng chưa hiệu lực vẫn hủy được dù ngày bắt đầu đã qua', () => {
    expect(actionsOf('ChoNhanCoc', '2026-10-20', HOLD_NOT_EXPIRED).canCancel).toBe(true)
  })

  it('DangHieuLuc: hủy được khi hôm nay còn trước ngày bắt đầu', () => {
    expect(actionsOf('DangHieuLuc', '2026-10-30')).toEqual({ canConfirm: false, canRequestChanges: false, canCancel: true })
  })

  it('DangHieuLuc: từ đúng ngày bắt đầu thì không hủy được nữa', () => {
    expect(actionsOf('DangHieuLuc', TODAY).canCancel).toBe(false)
    expect(actionsOf('DangHieuLuc', '2026-10-01').canCancel).toBe(false)
  })

  it.each<ContractStatus>(['SapHetHan', 'DangThanhLy', 'DaThanhLy', 'DaHuy'])('%s: không có nút nào', (status) => {
    expect(actionsOf(status)).toEqual({ canConfirm: false, canRequestChanges: false, canCancel: false })
  })
})
