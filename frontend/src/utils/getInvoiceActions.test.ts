import { describe, expect, it } from 'vitest'
import type { InvoiceStatus, InvoiceType, PaymentReport } from '@/types/invoiceTypes'
import { getLandlordInvoiceActions, getTenantInvoiceActions } from '@/utils/getInvoiceActions'

function report(id: number, status: PaymentReport['status']): PaymentReport {
  return {
    id,
    reportedAmount: 1000000,
    proofImageUrl: 'https://storage.example/signed/minh-chung.jpg',
    reportedAt: '2026-11-10T03:00:00Z',
    status,
    confirmedAmount: null,
    confirmedAt: null,
    rejectReason: null,
  }
}

function invoice(status: InvoiceStatus, options: { type?: InvoiceType; paidAmount?: number; reports?: PaymentReport[] } = {}) {
  return {
    id: 54,
    type: options.type ?? 'DinhKy',
    status,
    paidAmount: options.paidAmount ?? 0,
    paymentReports: options.reports ?? [],
  }
}

describe('getLandlordInvoiceActions', () => {
  it('hóa đơn nháp thì sửa, phát hành, hủy được', () => {
    expect(getLandlordInvoiceActions(invoice('Nhap'), null)).toMatchObject({
      canEdit: true,
      canIssue: true,
      canCancel: true,
      pendingReport: null,
      isSettlement: false,
    })
  })

  it('đã phát hành, chưa thu đồng nào thì chỉ hóa đơn định kỳ mới nhất sửa, hủy được', () => {
    for (const status of ['ChuaThanhToan', 'QuaHan'] as const) {
      expect(getLandlordInvoiceActions(invoice(status), 54)).toMatchObject({ canEdit: true, canCancel: true, canIssue: false })
      expect(getLandlordInvoiceActions(invoice(status), 60)).toMatchObject({ canEdit: false, canCancel: false })
      // Danh sách hóa đơn của hợp đồng chưa tải xong.
      expect(getLandlordInvoiceActions(invoice(status), null)).toMatchObject({ canEdit: false, canCancel: false })
    }
  })

  it('đã thu một phần hoặc đã thanh toán thì không sửa, hủy được nữa', () => {
    expect(getLandlordInvoiceActions(invoice('QuaHan', { paidAmount: 500000 }), 54)).toMatchObject({
      canEdit: false,
      canCancel: false,
    })
    expect(getLandlordInvoiceActions(invoice('ThanhToanMotPhan', { paidAmount: 500000 }), 54).canEdit).toBe(false)
    expect(getLandlordInvoiceActions(invoice('DaThanhToan', { paidAmount: 3000000 }), 54).canEdit).toBe(false)
  })

  it('chờ xác nhận thì trả lượt báo đang chờ, kể cả hóa đơn thanh lý', () => {
    const pending = report(9, 'ChoXacNhan')
    const reports = [report(8, 'TuChoiXacNhan'), pending]
    expect(getLandlordInvoiceActions(invoice('ChoXacNhan', { reports }), 54).pendingReport).toBe(pending)
    expect(getLandlordInvoiceActions(invoice('ChoXacNhan', { type: 'ThanhLy', reports }), null)).toMatchObject({
      pendingReport: pending,
      isSettlement: true,
    })
  })

  it('hóa đơn thanh lý không có sửa, phát hành, hủy ở L8', () => {
    expect(getLandlordInvoiceActions(invoice('Nhap', { type: 'ThanhLy' }), null)).toMatchObject({
      canEdit: false,
      canIssue: false,
      canCancel: false,
      isSettlement: true,
    })
  })
})

describe('getTenantInvoiceActions', () => {
  it('còn phải trả thì báo đã thanh toán được, kể cả hóa đơn thanh lý', () => {
    for (const status of ['ChuaThanhToan', 'ThanhToanMotPhan', 'QuaHan'] as const) {
      expect(getTenantInvoiceActions(invoice(status)).canReportPayment).toBe(true)
    }
    expect(getTenantInvoiceActions(invoice('ChuaThanhToan', { type: 'ThanhLy' })).canReportPayment).toBe(true)
  })

  it('đang chờ xác nhận, đã thanh toán, đã hủy thì không báo được', () => {
    const pending = report(9, 'ChoXacNhan')
    expect(getTenantInvoiceActions(invoice('ChoXacNhan', { reports: [pending] }))).toEqual({
      canReportPayment: false,
      pendingReport: pending,
    })
    for (const status of ['DaThanhToan', 'DaHuy', 'DaChuyenThanhLy', 'ChoNguoiThueXacNhan', 'ChoHoanCoc'] as const) {
      expect(getTenantInvoiceActions(invoice(status)).canReportPayment).toBe(false)
    }
  })
})
