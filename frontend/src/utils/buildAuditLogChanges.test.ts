import { describe, expect, it } from 'vitest'
import { buildAuditLogChanges } from '@/utils/buildAuditLogChanges'

const NBSP = String.fromCharCode(0xa0)

describe('buildAuditLogChanges', () => {
  it('ghép trường của hai vế, đánh dấu trường đã đổi', () => {
    const changes = buildAuditLogChanges(
      { IsLocked: false },
      { IsLocked: true, Reason: 'Vi phạm điều khoản' },
      'AppUser',
    )
    expect(changes).toEqual([
      { field: 'IsLocked', label: 'Đang khóa', before: ['Không'], after: ['Có'], changed: true },
      { field: 'Reason', label: 'Lý do', before: ['—'], after: ['Vi phạm điều khoản'], changed: true },
    ])
  })

  it('giữ dòng không đổi với changed là false', () => {
    const [change] = buildAuditLogChanges({ DepositAmount: 3000000 }, { DepositAmount: 3000000 }, 'Contract')
    expect(change.changed).toBe(false)
    expect(change.before).toEqual([`3.000.000${NBSP}₫`])
  })

  it('xếp dòng đã đổi lên trước', () => {
    const changes = buildAuditLogChanges(
      { RentAmount: 100, WaterAmount: 200, TotalAmount: 300 },
      { RentAmount: 100, WaterAmount: 200, TotalAmount: 0 },
      'Invoice',
    )
    expect(changes.map((change) => change.field)).toEqual(['TotalAmount', 'RentAmount', 'WaterAmount'])
  })

  it('vế trước trống khi thao tác chỉ ghi giá trị mới', () => {
    const changes = buildAuditLogChanges(null, { BankBin: '970436', AccountNumber: '******6789' }, 'AppUser')
    expect(changes.map((change) => change.before)).toEqual([['—'], ['—']])
    expect(changes[1].after).toEqual(['******6789'])
  })

  it('cả hai vế trống thì không có dòng nào', () => {
    expect(buildAuditLogChanges(null, null, 'Invoice')).toEqual([])
  })

  it('hiện trạng thái theo loại đối tượng của nhật ký', () => {
    const fromContract = buildAuditLogChanges({ Status: 'ChoNhanCoc' }, { Status: 'DangHieuLuc' }, 'Contract')
    expect(fromContract[0].before).toEqual(['Chờ nhận cọc'])
    expect(fromContract[0].after).toEqual(['Đang hiệu lực'])

    const fromInvoice = buildAuditLogChanges({ Status: 'ChoXacNhan' }, null, 'Invoice')
    expect(fromInvoice[0].before).toEqual(['Chờ xác nhận'])

    const fromApplication = buildAuditLogChanges({ Status: 'ChoDuyet', Role: 'Tenant' }, null, 'LandlordApplication')
    expect(fromApplication[0].before).toEqual(['Chờ duyệt'])
    expect(fromApplication[1].before).toEqual(['Người thuê'])
  })

  it('giữ nguyên mã lạ để trang vẫn dùng được', () => {
    const changes = buildAuditLogChanges({ Status: 'Khac', TruongMoi: 'x' }, null, 'Room')
    expect(changes[0].before).toEqual(['Khac'])
    expect(changes[1]).toMatchObject({ label: 'TruongMoi', before: ['x'] })
  })

  it('định dạng tiền, chỉ số và ngày', () => {
    const changes = buildAuditLogChanges(
      {
        RentPrice: 1500000,
        InitialWaterIndex: 1182.5,
        DueDate: '2026-11-10',
        DepositRefundedAt: '2026-10-22T17:00:00+00:00',
      },
      null,
      'Contract',
    )
    expect(changes.map((change) => change.before[0])).toEqual([
      `1.500.000${NBSP}₫`,
      '1.182,5',
      '10/11/2026',
      '23/10/2026 00:00',
    ])
  })

  it('đổi mã hình thức tiền, bên hủy, trạng thái phòng sang nhãn; chuỗi rỗng là trống', () => {
    const changes = buildAuditLogChanges(
      { DepositRefundMethod: 'TienMat', CancelledBy: 'Landlord', RoomStatus: 'DangThue', DepositRefundNote: '' },
      null,
      'Contract',
    )
    expect(changes.map((change) => change.before[0])).toEqual(['Tiền mặt', 'Chủ trọ', 'Đang thuê', '—'])
  })

  it('mảng thì mỗi phần tử một dòng, bỏ trường trống của phần tử', () => {
    const [fees, lines] = buildAuditLogChanges(
      {
        ServiceFees: [
          { Name: 'Wifi', Amount: 100000 },
          { Name: 'Rác', Amount: 20000 },
        ],
        Lines: [{ Category: 'PhiPhat', Description: 'Trả phòng sớm', Amount: 500000, RelatedInvoiceId: null }],
      },
      { ServiceFees: [], Lines: [] },
      'Invoice',
    )
    expect(fees.before).toEqual([`Tên khoản: Wifi · Số tiền: 100.000${NBSP}₫`, `Tên khoản: Rác · Số tiền: 20.000${NBSP}₫`])
    expect(fees.after).toEqual(['—'])
    expect(lines.before).toEqual([`Loại dòng: Phí phạt · Nội dung: Trả phòng sớm · Số tiền: 500.000${NBSP}₫`])
  })

  it('giữ nguyên chữ có thẻ HTML, không dựng thành phần tử', () => {
    const [change] = buildAuditLogChanges(null, { Reason: '<img src=x onerror=alert(1)>' }, 'AppUser')
    expect(change.after).toEqual(['<img src=x onerror=alert(1)>'])
  })
})
