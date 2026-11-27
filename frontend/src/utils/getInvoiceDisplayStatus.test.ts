import { describe, expect, it } from 'vitest'
import { getInvoiceDisplayStatus } from '@/utils/getInvoiceDisplayStatus'
import { getStatusDisplay } from '@/utils/statusLabels'

describe('getInvoiceDisplayStatus', () => {
  it('hóa đơn thanh lý Chủ trọ đã hoàn 2.758.083 đ cọc dư: Đã hoàn cọc', () => {
    const status = getInvoiceDisplayStatus({ type: 'ThanhLy', status: 'DaThanhToan', totalAmount: -2758083 })
    expect(status).toBe('DaHoanCoc')
    expect(getStatusDisplay('invoice', status)).toEqual({ label: 'Đã hoàn cọc', tone: 'success' })
  })

  it('hóa đơn thanh lý chưa hoàn cọc giữ Chờ hoàn cọc', () => {
    expect(getInvoiceDisplayStatus({ type: 'ThanhLy', status: 'ChoHoanCoc', totalAmount: -2758083 })).toBe('ChoHoanCoc')
  })

  it('hóa đơn thanh lý người thuê đã trả 542.033 đ giữ Đã thanh toán', () => {
    expect(getInvoiceDisplayStatus({ type: 'ThanhLy', status: 'DaThanhToan', totalAmount: 542033 })).toBe('DaThanhToan')
  })

  it('hóa đơn thanh lý số dư 0 giữ Đã thanh toán', () => {
    expect(getInvoiceDisplayStatus({ type: 'ThanhLy', status: 'DaThanhToan', totalAmount: 0 })).toBe('DaThanhToan')
  })

  it('hóa đơn định kỳ giữ nguyên mã', () => {
    expect(getInvoiceDisplayStatus({ type: 'DinhKy', status: 'DaThanhToan', totalAmount: 3305000 })).toBe('DaThanhToan')
  })
})
