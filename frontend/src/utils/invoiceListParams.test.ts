import { describe, expect, it } from 'vitest'
import { parseInvoiceListParams, toInvoiceListSearch } from '@/utils/invoiceListParams'

describe('parseInvoiceListParams', () => {
  it('đọc lối tắt từ dashboard: L1 lọc chờ xác nhận, T1 lọc bảng thanh lý chờ đồng ý', () => {
    expect(parseInvoiceListParams(new URLSearchParams('status=ChoXacNhan'), 'landlord')).toEqual({
      status: 'ChoXacNhan',
      month: undefined,
      propertyId: undefined,
      page: 1,
    })
    expect(
      parseInvoiceListParams(new URLSearchParams('type=ThanhLy&status=ChoNguoiThueXacNhan'), 'tenant'),
    ).toEqual({ status: 'ChoNguoiThueXacNhan', type: 'ThanhLy', page: 1 })
  })

  it('Chủ trọ đọc tháng, khu trọ, trang', () => {
    expect(parseInvoiceListParams(new URLSearchParams('month=2026-10&propertyId=13&page=3'), 'landlord')).toEqual({
      status: undefined,
      month: '2026-10',
      propertyId: 13,
      page: 3,
    })
  })

  it('giá trị lạ thì coi như không lọc', () => {
    expect(
      parseInvoiceListParams(new URLSearchParams('status=Sai&month=2026-13&propertyId=-1&page=0'), 'landlord'),
    ).toEqual({ status: undefined, month: undefined, propertyId: undefined, page: 1 })
    expect(parseInvoiceListParams(new URLSearchParams('type=Khac&page=abc'), 'tenant')).toEqual({
      status: undefined,
      type: undefined,
      page: 1,
    })
  })

  it('mỗi vai trò chỉ đọc bộ lọc có ô nhập trên màn của mình', () => {
    // L8 không có ô lọc loại: `?type=ThanhLy` không được lọc ngầm danh sách của Chủ trọ.
    expect(parseInvoiceListParams(new URLSearchParams('type=ThanhLy'), 'landlord')).not.toHaveProperty('type')
    // T5 không có ô lọc tháng, khu trọ.
    const tenant = parseInvoiceListParams(new URLSearchParams('month=2026-10&propertyId=13'), 'tenant')
    expect(tenant).not.toHaveProperty('month')
    expect(tenant).not.toHaveProperty('propertyId')
  })
})

describe('toInvoiceListSearch', () => {
  it('bỏ khóa trống, không giữ trang', () => {
    expect(toInvoiceListSearch({ status: 'QuaHan', month: undefined, propertyId: 13 })).toEqual({
      status: 'QuaHan',
      propertyId: '13',
    })
    expect(toInvoiceListSearch({})).toEqual({})
  })
})
