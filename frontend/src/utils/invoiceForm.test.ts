import { describe, expect, it } from 'vitest'
import type { ContractInvoiceListItem, InvoiceDetail, InvoiceStatus, InvoiceType } from '@/types/invoiceTypes'
import {
  getInvoiceFormValues,
  getLatestPeriodicInvoiceId,
  getNewInvoiceFormValues,
  getPreviewRequest,
  getRelatedInvoiceOptions,
  toPeriodicInvoiceRequest,
  validatePaymentAmount,
} from '@/utils/invoiceForm'

function listItem(id: number, type: InvoiceType, status: InvoiceStatus): ContractInvoiceListItem {
  return {
    id,
    type,
    status,
    periodStart: '2026-10-01',
    periodEnd: '2026-10-31',
    totalAmount: 3000000,
    paidAmount: 0,
    issuedAt: null,
    dueDate: null,
  }
}

// Chi tiết hóa đơn định kỳ tháng 11 của Chủ trọ: có ảnh đồng hồ điện, một dòng giảm trỏ về hóa đơn 50.
const INVOICE = {
  id: 51,
  type: 'DinhKy',
  currentElectricityIndex: 1250.5,
  currentWaterIndex: 84,
  electricityMeterPhotoPath: 'landlord/24/anh-dong-ho/dien.jpg',
  electricityMeterPhotoUrl: 'https://storage.example/signed/dien.jpg?token=abc',
  waterMeterPhotoPath: null,
  waterMeterPhotoUrl: null,
  lines: [
    {
      category: 'DieuChinhKhac',
      description: 'Tháng 10 ghi dư 20 số điện',
      amount: -70000,
      evidenceUrl: null,
      evidencePath: null,
      relatedInvoiceId: 50,
    },
  ],
} as unknown as InvoiceDetail

describe('getNewInvoiceFormValues', () => {
  it('lập mới thì chỉ số để trống, chưa có ảnh và dòng điều chỉnh', () => {
    expect(getNewInvoiceFormValues()).toEqual({
      currentElectricityIndex: '',
      currentWaterIndex: '',
      electricityPhoto: [],
      waterPhoto: [],
      adjustmentLines: [],
    })
  })
})

describe('getInvoiceFormValues', () => {
  it('giữ path đã lưu của ảnh để PUT gửi lại, không dùng URL có chữ ký', () => {
    const values = getInvoiceFormValues(INVOICE)
    expect(values.electricityPhoto).toEqual([
      { path: 'landlord/24/anh-dong-ho/dien.jpg', url: 'https://storage.example/signed/dien.jpg?token=abc' },
    ])
    expect(values.waterPhoto).toEqual([])
    expect(toPeriodicInvoiceRequest(values).electricityMeterPhotoPath).toBe('landlord/24/anh-dong-ho/dien.jpg')
  })

  it('chỉ số dùng dấu phẩy thập phân, dòng điều chỉnh giữ hóa đơn gốc', () => {
    const values = getInvoiceFormValues(INVOICE)
    expect(values.currentElectricityIndex).toBe('1250,5')
    expect(values.currentWaterIndex).toBe('84')
    expect(values.adjustmentLines).toEqual([
      { description: 'Tháng 10 ghi dư 20 số điện', amount: '-70000', relatedInvoiceId: '50' },
    ])
  })
})

describe('toPeriodicInvoiceRequest', () => {
  it('đổi chuỗi người dùng gõ sang body: chỉ số thập phân, số tiền bỏ dấu chấm, không gửi chỉ số cũ hay tiền', () => {
    const request = toPeriodicInvoiceRequest({
      currentElectricityIndex: '1250,5',
      currentWaterIndex: ' 84 ',
      electricityPhoto: [],
      waterPhoto: [{ path: 'landlord/24/anh-dong-ho/nuoc.jpg', url: null }],
      adjustmentLines: [
        { description: '  Tháng 10 ghi dư 20 số điện ', amount: '-70.000', relatedInvoiceId: '50' },
        { description: 'Giảm tiền rác tháng Tết', amount: '-20000', relatedInvoiceId: '' },
      ],
    })

    expect(request).toEqual({
      currentElectricityIndex: 1250.5,
      currentWaterIndex: 84,
      electricityMeterPhotoPath: null,
      waterMeterPhotoPath: 'landlord/24/anh-dong-ho/nuoc.jpg',
      adjustmentLines: [
        { category: 'DieuChinhKhac', description: 'Tháng 10 ghi dư 20 số điện', amount: -70000, relatedInvoiceId: 50 },
        { category: 'DieuChinhKhac', description: 'Giảm tiền rác tháng Tết', amount: -20000, relatedInvoiceId: null },
      ],
    })
  })
})

describe('validatePaymentAmount', () => {
  it('số đồng nguyên lớn hơn 0, nhận dấu chấm hàng nghìn', () => {
    expect(validatePaymentAmount('1.953.467')).toBe(true)
    expect(validatePaymentAmount('500000')).toBe(true)
    expect(validatePaymentAmount('')).toBe('Vui lòng nhập số tiền.')
    expect(validatePaymentAmount('0')).toBe('Số tiền phải lớn hơn 0.')
    expect(validatePaymentAmount('-50000')).not.toBe(true)
    expect(validatePaymentAmount('1500,5')).not.toBe(true)
    expect(validatePaymentAmount('1000000000000')).not.toBe(true)
  })
})

describe('getLatestPeriodicInvoiceId', () => {
  it('là hóa đơn định kỳ chưa hủy đầu tiên của danh sách kỳ mới trước, bỏ qua hóa đơn thanh lý', () => {
    expect(
      getLatestPeriodicInvoiceId([
        listItem(60, 'ThanhLy', 'Nhap'),
        listItem(55, 'DinhKy', 'DaHuy'),
        listItem(54, 'DinhKy', 'ChuaThanhToan'),
        listItem(50, 'DinhKy', 'DaThanhToan'),
      ]),
    ).toBe(54)
  })

  it('chưa có hóa đơn định kỳ nào thì null', () => {
    expect(getLatestPeriodicInvoiceId([])).toBeNull()
    expect(getLatestPeriodicInvoiceId([listItem(55, 'DinhKy', 'DaHuy')])).toBeNull()
  })
})

describe('getRelatedInvoiceOptions', () => {
  it('chỉ hóa đơn định kỳ chưa hủy, trừ hóa đơn đang sửa', () => {
    const options = getRelatedInvoiceOptions(
      [
        listItem(60, 'ThanhLy', 'Nhap'),
        listItem(55, 'DinhKy', 'DaHuy'),
        listItem(54, 'DinhKy', 'Nhap'),
        listItem(50, 'DinhKy', 'DaThanhToan'),
      ],
      54,
    )
    expect(options.map((invoice) => invoice.id)).toEqual([50])
  })
})

describe('getPreviewRequest', () => {
  const previous = { electricityIndex: 700, waterIndex: 53 }
  const filled = {
    ...getNewInvoiceFormValues(),
    currentElectricityIndex: '780',
    currentWaterIndex: '57,5',
    electricityPhoto: [{ path: 'landlord/1/a.jpg', url: 'https://x/a.jpg' }],
  }

  it('đủ hai chỉ số hợp lệ thì gửi chỉ số và dòng điều chỉnh, không gửi ảnh', () => {
    expect(getPreviewRequest(filled, previous)).toEqual({
      currentElectricityIndex: 780,
      currentWaterIndex: 57.5,
      electricityMeterPhotoPath: null,
      waterMeterPhotoPath: null,
      adjustmentLines: [],
    })
  })

  it('thiếu một chỉ số hoặc chỉ số sai dạng thì chưa gọi', () => {
    expect(getPreviewRequest({ ...filled, currentWaterIndex: '' }, previous)).toBeNull()
    expect(getPreviewRequest({ ...filled, currentElectricityIndex: '78,123' }, previous)).toBeNull()
  })

  it('chỉ số mới nhỏ hơn chỉ số cũ 700 kWh thì chưa gọi', () => {
    expect(getPreviewRequest({ ...filled, currentElectricityIndex: '699' }, previous)).toBeNull()
  })

  it('dòng điều chỉnh chưa có mô tả hoặc số tiền thì chưa gọi; đủ thì gửi kèm', () => {
    const line = { description: 'Tháng 8 ghi dư 20 số điện', amount: '-70.000', relatedInvoiceId: '30' }
    expect(getPreviewRequest({ ...filled, adjustmentLines: [{ ...line, description: ' ' }] }, previous)).toBeNull()
    expect(getPreviewRequest({ ...filled, adjustmentLines: [{ ...line, amount: '' }] }, previous)).toBeNull()
    expect(getPreviewRequest({ ...filled, adjustmentLines: [line] }, previous)?.adjustmentLines).toEqual([
      { category: 'DieuChinhKhac', description: 'Tháng 8 ghi dư 20 số điện', amount: -70000, relatedInvoiceId: 30 },
    ])
  })

  it('chưa tải được chỉ số cũ thì vẫn gọi, server tự kiểm tra', () => {
    expect(getPreviewRequest(filled, null)).not.toBeNull()
  })
})
