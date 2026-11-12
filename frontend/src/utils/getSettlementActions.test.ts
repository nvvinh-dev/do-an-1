import { describe, expect, it } from 'vitest'
import type { InvoiceStatus } from '@/types/invoiceTypes'
import { getSettlementActions } from '@/utils/getSettlementActions'

// Gửi lúc 09:00 ngày 03/11 giờ Việt Nam: đủ 7 ngày lúc 09:00 ngày 10/11.
const SENT_AT = '2026-11-03T02:00:00Z'
const DEADLINE = new Date('2026-11-10T02:00:00Z')

function invoiceOf(status: InvoiceStatus, sentAt: string | null = null) {
  return { status, sentAt }
}

describe('getSettlementActions', () => {
  it('hợp đồng đang thanh lý chưa có bảng thì chỉ lập được', () => {
    expect(getSettlementActions('DangThanhLy', null, DEADLINE)).toMatchObject({
      canCreate: true,
      canEdit: false,
      canSend: false,
      canFinalize: false,
      canComplete: false,
    })
  })

  it('bảng nháp thì sửa và gửi được', () => {
    expect(getSettlementActions('DangThanhLy', invoiceOf('Nhap'), DEADLINE)).toMatchObject({
      canCreate: false,
      canEdit: true,
      canSend: true,
      finalizeAllowedAfter: null,
      canComplete: false,
    })
  })

  it('bảng chờ người thuê chỉ tự chốt được sau đúng mốc 7 ngày từ lần gửi gần nhất', () => {
    const atDeadline = getSettlementActions('DangThanhLy', invoiceOf('ChoNguoiThueXacNhan', SENT_AT), DEADLINE)
    expect(atDeadline.finalizeAllowedAfter).toEqual(DEADLINE)
    expect(atDeadline.canFinalize).toBe(false)
    expect(atDeadline.canEdit).toBe(false)

    const after = getSettlementActions(
      'DangThanhLy',
      invoiceOf('ChoNguoiThueXacNhan', SENT_AT),
      new Date(DEADLINE.getTime() + 1),
    )
    expect(after.canFinalize).toBe(true)
  })

  it.each<InvoiceStatus>(['ChuaThanhToan', 'ThanhToanMotPhan', 'QuaHan', 'ChoXacNhan', 'DaThanhToan'])(
    'bảng đã khóa ở %s thì hoàn tất được, không cần hoàn cọc',
    (status) => {
      expect(getSettlementActions('DangThanhLy', invoiceOf(status, SENT_AT), DEADLINE)).toMatchObject({
        isLocked: true,
        canComplete: true,
        needsRefund: false,
        canFinalize: false,
      })
    },
  )

  it('số dư âm (chờ hoàn cọc) thì hoàn tất phải kèm thông tin hoàn cọc', () => {
    expect(getSettlementActions('DangThanhLy', invoiceOf('ChoHoanCoc', SENT_AT), DEADLINE)).toMatchObject({
      canComplete: true,
      needsRefund: true,
    })
  })

  it('hợp đồng đã thanh lý thì chỉ xem', () => {
    expect(getSettlementActions('DaThanhLy', invoiceOf('DaThanhToan', SENT_AT), DEADLINE)).toMatchObject({
      canCreate: false,
      canEdit: false,
      canSend: false,
      canFinalize: false,
      isLocked: true,
      canComplete: false,
      needsRefund: false,
    })
  })
})
