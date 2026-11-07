import { describe, expect, it } from 'vitest'
import type { ContractStatus } from '@/types/contractTypes'
import { getLandlordContractActions, type LandlordContractActions } from '@/utils/getLandlordContractActions'

const TODAY = '2026-11-07'
const NOW = new Date('2026-11-07T03:00:00Z')
const HOLD_OPEN = '2026-11-08T03:00:00Z'
const HOLD_EXPIRED = '2026-11-07T02:40:00Z'
const BEFORE_START = '2026-11-10'
const STARTED = '2026-11-01'

const NONE: LandlordContractActions = {
  canEdit: false,
  canSend: false,
  canRecall: false,
  canConfirmDeposit: false,
  canCancel: false,
  canEditInitialMeter: false,
  canRecordRefund: false,
  canCreateInvoice: false,
  showInvoices: false,
}

function actionsOf(
  status: ContractStatus,
  {
    startDate = BEFORE_START,
    holdExpiresAt = null as string | null,
    depositRefundPending = false,
    hasActiveInvoice = false,
  } = {},
) {
  return getLandlordContractActions({ status, startDate, holdExpiresAt, depositRefundPending }, TODAY, NOW, hasActiveInvoice)
}

describe('getLandlordContractActions', () => {
  it('Nhap còn hạn giữ chỗ: sửa, gửi, hủy', () => {
    expect(actionsOf('Nhap', { holdExpiresAt: HOLD_OPEN })).toEqual({
      ...NONE,
      canEdit: true,
      canSend: true,
      canCancel: true,
    })
  })

  it('ChoNguoiThueXacNhan: thu hồi, hủy', () => {
    expect(actionsOf('ChoNguoiThueXacNhan', { holdExpiresAt: HOLD_OPEN })).toEqual({
      ...NONE,
      canRecall: true,
      canCancel: true,
    })
  })

  it('ChoNhanCoc: xác nhận cọc, thu hồi, hủy', () => {
    expect(actionsOf('ChoNhanCoc', { holdExpiresAt: HOLD_OPEN })).toEqual({
      ...NONE,
      canConfirmDeposit: true,
      canRecall: true,
      canCancel: true,
    })
  })

  it('quá hạn giữ chỗ mà tác vụ chưa chạy: chỉ còn hủy', () => {
    for (const status of ['Nhap', 'ChoNguoiThueXacNhan', 'ChoNhanCoc'] as const) {
      expect(actionsOf(status, { holdExpiresAt: HOLD_EXPIRED })).toEqual({ ...NONE, canCancel: true })
    }
  })

  it('DangHieuLuc trước ngày bắt đầu, chưa có hóa đơn: hủy, sửa chỉ số đầu, xem hóa đơn', () => {
    expect(actionsOf('DangHieuLuc')).toEqual({
      ...NONE,
      canCancel: true,
      canEditInitialMeter: true,
      showInvoices: true,
    })
  })

  it('DangHieuLuc từ ngày bắt đầu: lập hóa đơn, không hủy được nữa', () => {
    expect(actionsOf('DangHieuLuc', { startDate: TODAY })).toEqual({
      ...NONE,
      canEditInitialMeter: true,
      canCreateInvoice: true,
      showInvoices: true,
    })
  })

  it('DangHieuLuc đã có hóa đơn chưa hủy: không sửa chỉ số đầu', () => {
    expect(actionsOf('DangHieuLuc', { startDate: STARTED, hasActiveInvoice: true }).canEditInitialMeter).toBe(false)
  })

  it('SapHetHan: lập hóa đơn, xem hóa đơn', () => {
    expect(actionsOf('SapHetHan', { startDate: STARTED, hasActiveInvoice: true })).toEqual({
      ...NONE,
      canCreateInvoice: true,
      showInvoices: true,
    })
  })

  it('DangThanhLy: lập hóa đơn cho tháng còn thiếu, xem hóa đơn', () => {
    expect(actionsOf('DangThanhLy', { startDate: STARTED })).toEqual({
      ...NONE,
      canCreateInvoice: true,
      showInvoices: true,
    })
  })

  it('DaHuy chờ hoàn cọc: ghi nhận hoàn cọc; đã hoàn thì chỉ xem', () => {
    expect(actionsOf('DaHuy', { depositRefundPending: true })).toEqual({ ...NONE, canRecordRefund: true })
    expect(actionsOf('DaHuy')).toEqual(NONE)
  })

  it('DaThanhLy: chỉ xem, còn danh sách hóa đơn', () => {
    expect(actionsOf('DaThanhLy', { startDate: STARTED })).toEqual({ ...NONE, showInvoices: true })
  })
})
