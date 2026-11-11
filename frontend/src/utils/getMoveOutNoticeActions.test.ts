import { describe, expect, it } from 'vitest'
import type { ContractStatus, MoveOutNotice } from '@/types/contractTypes'
import { getMoveOutNoticeActions, type ContractViewer } from '@/utils/getMoveOutNoticeActions'

const TODAY = '2026-11-11'

const TENANT_NOTICE: MoveOutNotice = {
  noticeAt: '2026-11-10T03:00:00Z',
  noticeBy: 'Tenant',
  expectedMoveOutDate: '2026-11-30',
  reason: 'Chuyển chỗ làm',
  noticeDays: 20,
  penaltyAllowed: true,
}

function actionsOf(
  status: ContractStatus,
  viewer: ContractViewer,
  options: { startDate?: string; moveOutNotice?: MoveOutNotice | null; settlementInvoiceId?: number | null } = {},
) {
  return getMoveOutNoticeActions(
    {
      status,
      startDate: options.startDate ?? '2026-10-01',
      moveOutNotice: options.moveOutNotice ?? null,
      settlementInvoiceId: options.settlementInvoiceId ?? null,
    },
    viewer,
    TODAY,
  )
}

describe('getMoveOutNoticeActions', () => {
  it('DangHieuLuc từ ngày bắt đầu: cả hai bên gửi được', () => {
    expect(actionsOf('DangHieuLuc', 'Tenant')).toEqual({ canSend: true, canWithdraw: false })
    expect(actionsOf('DangHieuLuc', 'Landlord')).toEqual({ canSend: true, canWithdraw: false })
  })

  it('DangHieuLuc đúng ngày bắt đầu: gửi được', () => {
    expect(actionsOf('DangHieuLuc', 'Tenant', { startDate: TODAY }).canSend).toBe(true)
  })

  it('DangHieuLuc trước ngày bắt đầu: không gửi được, kết thúc bằng hủy hợp đồng', () => {
    expect(actionsOf('DangHieuLuc', 'Tenant', { startDate: '2026-11-12' }).canSend).toBe(false)
  })

  it('SapHetHan: gửi được', () => {
    expect(actionsOf('SapHetHan', 'Landlord')).toEqual({ canSend: true, canWithdraw: false })
  })

  it.each<ContractStatus>(['Nhap', 'ChoNguoiThueXacNhan', 'ChoNhanCoc', 'DangThanhLy', 'DaThanhLy', 'DaHuy'])(
    '%s: không gửi được',
    (status) => {
      expect(actionsOf(status, 'Tenant').canSend).toBe(false)
    },
  )

  it('DangThanhLy, người xem là bên gửi, chưa có bảng thanh lý: rút được', () => {
    expect(actionsOf('DangThanhLy', 'Tenant', { moveOutNotice: TENANT_NOTICE })).toEqual({
      canSend: false,
      canWithdraw: true,
    })
  })

  it('DangThanhLy, người xem không phải bên gửi: không rút được', () => {
    expect(actionsOf('DangThanhLy', 'Landlord', { moveOutNotice: TENANT_NOTICE }).canWithdraw).toBe(false)
  })

  it('DangThanhLy đã có bảng thanh lý: bên gửi cũng không rút được', () => {
    expect(
      actionsOf('DangThanhLy', 'Tenant', { moveOutNotice: TENANT_NOTICE, settlementInvoiceId: 53 }).canWithdraw,
    ).toBe(false)
  })

  it('DaThanhLy còn thông tin thông báo: không rút được', () => {
    expect(actionsOf('DaThanhLy', 'Tenant', { moveOutNotice: TENANT_NOTICE }).canWithdraw).toBe(false)
  })
})
