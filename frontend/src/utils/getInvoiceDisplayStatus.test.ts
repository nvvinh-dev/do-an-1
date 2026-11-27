import { describe, expect, it } from 'vitest'
import { getInvoiceDisplayStatus, isRefundInvoice } from '@/utils/getInvoiceDisplayStatus'
import { getStatusDisplay } from '@/utils/statusLabels'

describe('isRefundInvoice', () => {
  it('hóa đơn thanh lý Chủ trọ hoàn 2.758.083 đ: hoàn cọc', () => {
    expect(isRefundInvoice({ type: 'ThanhLy', totalAmount: -2758083 })).toBe(true)
  })

  it('hóa đơn thanh lý số dư 542.033 đ người thuê trả từng phần: không phải hoàn cọc', () => {
    expect(isRefundInvoice({ type: 'ThanhLy', totalAmount: 542033 })).toBe(false)
  })

  it('hóa đơn thanh lý số dư 0 và hóa đơn định kỳ: không phải hoàn cọc', () => {
    expect(isRefundInvoice({ type: 'ThanhLy', totalAmount: 0 })).toBe(false)
    expect(isRefundInvoice({ type: 'DinhKy', totalAmount: 3305000 })).toBe(false)
  })
})

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
