import { describe, expect, it } from 'vitest'
import type { InvoiceDetail } from '@/types/invoiceTypes'
import {
  getNewSettlementFormValues,
  getSettlementFormValues,
  normalizeLineAmount,
  toSettlementInvoiceRequest,
  validateLineAmount,
  validateLineDescription,
  validateMoveOutDate,
  validateNotBelowPrevious,
} from '@/utils/settlementForm'

describe('getNewSettlementFormValues', () => {
  it('ngày trả phòng điền ngày dự kiến khi đã tới, chưa tới thì điền hôm nay', () => {
    expect(getNewSettlementFormValues('2026-11-10', '2026-11-12').moveOutDate).toBe('2026-11-10')
    expect(getNewSettlementFormValues('2026-11-20', '2026-11-12').moveOutDate).toBe('2026-11-12')
    expect(getNewSettlementFormValues(null, '2026-11-12').moveOutDate).toBe('2026-11-12')
  })
})

describe('validateLineAmount', () => {
  it('bồi thường và phí phạt là số đồng nguyên lớn hơn 0', () => {
    expect(validateLineAmount('300.000', 'BoiThuongHuHong')).toBe(true)
    expect(validateLineAmount('0', 'PhiPhat')).not.toBe(true)
    expect(validateLineAmount('-50000', 'BoiThuongHuHong')).not.toBe(true)
    expect(validateLineAmount('1500,5', 'PhiPhat')).not.toBe(true)
    expect(validateLineAmount('', 'PhiPhat')).toBe('Vui lòng nhập số tiền.')
  })

  it('điều chỉnh khác nhận cả số âm', () => {
    expect(validateLineAmount('-200.000', 'DieuChinhKhac')).toBe(true)
    expect(validateLineAmount('70000', 'DieuChinhKhac')).toBe(true)
    expect(validateLineAmount('-', 'DieuChinhKhac')).toBe('Vui lòng nhập số tiền.')
    expect(validateLineAmount('1000000000000', 'DieuChinhKhac')).not.toBe(true)
  })

  it('bỏ dấu chấm hàng nghìn, giữ dấu trừ', () => {
    expect(normalizeLineAmount(' -1.500.000 ')).toBe('-1500000')
    expect(normalizeLineAmount('3.5')).toBe('3.5')
  })
})

describe('validateLineDescription', () => {
  it('bắt buộc và tối đa 500 ký tự sau khi bỏ khoảng trắng', () => {
    expect(validateLineDescription('   ')).not.toBe(true)
    expect(validateLineDescription('Vỡ kính cửa sổ')).toBe(true)
    expect(validateLineDescription('a'.repeat(501))).not.toBe(true)
  })
})

describe('validateMoveOutDate', () => {
  it('không sau hôm nay và không trước ngày bắt đầu', () => {
    expect(validateMoveOutDate('2026-11-12', '2026-01-01', '2026-11-12')).toBe(true)
    expect(validateMoveOutDate('2026-11-13', '2026-01-01', '2026-11-12')).not.toBe(true)
    expect(validateMoveOutDate('2025-12-31', '2026-01-01', '2026-11-12')).not.toBe(true)
    expect(validateMoveOutDate('', '2026-01-01', '2026-11-12')).not.toBe(true)
  })
})

describe('validateNotBelowPrevious', () => {
  it('chỉ số mới bằng chỉ số cũ vẫn được, nhỏ hơn thì báo lỗi', () => {
    expect(validateNotBelowPrevious('1250', 1250)).toBe(true)
    expect(validateNotBelowPrevious('1249,5', 1250)).not.toBe(true)
    expect(validateNotBelowPrevious('10', null)).toBe(true)
  })
})

const DRAFT: InvoiceDetail = {
  id: 53,
  contractId: 31,
  type: 'ThanhLy',
  periodStart: '2026-11-01',
  periodEnd: '2026-11-10',
  daysCharged: 10,
  daysInMonth: 30,
  previousElectricityIndex: 1250,
  currentElectricityIndex: 1310.5,
  electricityUnitPrice: 3500,
  electricityAmount: 211750,
  previousWaterIndex: 84,
  currentWaterIndex: 89,
  waterUnitPrice: 20000,
  waterAmount: 100000,
  rentAmount: 1000000,
  serviceFees: [],
  serviceFeeAmount: 0,
  totalAmount: -1388250,
  paidAmount: 0,
  status: 'Nhap',
  issuedAt: null,
  dueDate: null,
  settledAt: null,
  cancelReason: null,
  electricityMeterPhotoUrl: 'https://example.test/sign/dien',
  waterMeterPhotoUrl: null,
  electricityMeterPhotoPath: 'private-documents/AnhDongHo/20/2026/11/aaaa.jpg',
  waterMeterPhotoPath: null,
  lines: [
    {
      category: 'BoiThuongHuHong',
      description: 'Vỡ kính cửa sổ',
      amount: 300000,
      evidenceUrl: 'https://example.test/sign/kinh',
      evidencePath: 'private-documents/AnhHuHong/20/2026/11/bbbb.jpg',
      relatedInvoiceId: null,
    },
    {
      category: 'CongNoKyTruoc',
      description: 'Còn nợ hóa đơn tháng 10',
      amount: 1000000,
      evidenceUrl: null,
      evidencePath: null,
      relatedInvoiceId: 40,
    },
    {
      category: 'DieuChinhKhac',
      description: 'Tháng 10 ghi dư 20 số điện',
      amount: -70000,
      evidenceUrl: null,
      evidencePath: null,
      relatedInvoiceId: 40,
    },
    {
      category: 'KhauTruTienCoc',
      description: 'Trừ tiền cọc',
      amount: -3000000,
      evidenceUrl: null,
      evidencePath: null,
      relatedInvoiceId: null,
    },
  ],
  paymentReports: [],
  paymentQr: null,
  sentAt: '2026-11-11T02:00:00Z',
  tenantConfirmedAt: null,
  changeRequestReason: 'Kính đã vỡ từ trước khi tôi vào ở',
  landlordFinalizeNote: null,
}

describe('getSettlementFormValues và toSettlementInvoiceRequest', () => {
  it('sửa bảng nháp gửi lại đúng ảnh cũ và chỉ các dòng Chủ trọ nhập', () => {
    const values = getSettlementFormValues(DRAFT)
    expect(values.moveOutDate).toBe('2026-11-10')
    expect(values.currentElectricityIndex).toBe('1310,5')
    expect(values.lines.map((line) => line.category)).toEqual(['BoiThuongHuHong', 'DieuChinhKhac'])

    expect(toSettlementInvoiceRequest(values)).toEqual({
      currentElectricityIndex: 1310.5,
      currentWaterIndex: 89,
      moveOutDate: '2026-11-10',
      electricityMeterPhotoPath: 'private-documents/AnhDongHo/20/2026/11/aaaa.jpg',
      waterMeterPhotoPath: null,
      lines: [
        {
          category: 'BoiThuongHuHong',
          description: 'Vỡ kính cửa sổ',
          amount: 300000,
          evidencePath: 'private-documents/AnhHuHong/20/2026/11/bbbb.jpg',
          relatedInvoiceId: null,
        },
        {
          category: 'DieuChinhKhac',
          description: 'Tháng 10 ghi dư 20 số điện',
          amount: -70000,
          evidencePath: null,
          relatedInvoiceId: 40,
        },
      ],
    })
  })

  it('ảnh và hóa đơn gốc chỉ gửi với đúng loại dòng', () => {
    const request = toSettlementInvoiceRequest({
      currentElectricityIndex: '1310',
      currentWaterIndex: '89,25',
      moveOutDate: '2026-11-10',
      electricityPhoto: [],
      waterPhoto: [],
      lines: [
        {
          category: 'PhiPhat',
          description: '  Báo trước 10 ngày  ',
          amount: '1.000.000',
          evidence: [{ path: 'p', url: null }],
          relatedInvoiceId: '40',
        },
      ],
    })
    expect(request.currentWaterIndex).toBe(89.25)
    expect(request.lines[0]).toEqual({
      category: 'PhiPhat',
      description: 'Báo trước 10 ngày',
      amount: 1000000,
      evidencePath: null,
      relatedInvoiceId: null,
    })
  })
})
