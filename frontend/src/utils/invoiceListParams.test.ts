import { describe, expect, it } from 'vitest'
import { parseInvoiceListParams, toInvoiceListSearch } from '@/utils/invoiceListParams'

describe('parseInvoiceListParams', () => {
  it('đọc lối tắt từ dashboard: L1 lọc chờ xác nhận, T1 lọc bảng thanh lý chờ đồng ý', () => {
    expect(parseInvoiceListParams(new URLSearchParams('status=ChoXacNhan'), 'landlord')).toEqual({
      status: 'ChoXacNhan',
      month: undefined,
      type: undefined,
      propertyId: undefined,
      page: 1,
    })
    expect(
      parseInvoiceListParams(new URLSearchParams('type=ThanhLy&status=ChoNguoiThueXacNhan'), 'tenant'),
    ).toEqual({ status: 'ChoNguoiThueXacNhan', month: undefined, type: 'ThanhLy', page: 1 })
  })

  it('đọc tháng, khu trọ, trang', () => {
    expect(parseInvoiceListParams(new URLSearchParams('month=2026-10&propertyId=13&page=3'), 'landlord')).toMatchObject({
      month: '2026-10',
      propertyId: 13,
      page: 3,
    })
  })

  it('giá trị lạ thì coi như không lọc', () => {
    expect(
      parseInvoiceListParams(
        new URLSearchParams('status=Sai&type=Khac&month=2026-13&propertyId=-1&page=0'),
        'landlord',
      ),
    ).toEqual({ status: undefined, month: undefined, type: undefined, propertyId: undefined, page: 1 })
    expect(parseInvoiceListParams(new URLSearchParams('month=2026-1&page=abc'), 'tenant')).toMatchObject({
      month: undefined,
      page: 1,
    })
  })

  it('Người thuê không có bộ lọc khu trọ', () => {
    expect(parseInvoiceListParams(new URLSearchParams('propertyId=13'), 'tenant')).not.toHaveProperty('propertyId')
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
