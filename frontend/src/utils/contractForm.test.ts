import { describe, expect, it } from 'vitest'
import type { ContractDetail } from '@/types/contractTypes'
import type { RoomDetail } from '@/types/roomTypes'
import {
  getContractFormValues,
  getMaxCoOccupants,
  getNewContractFormValues,
  toContractTermsRequest,
  validateEndDate,
  validateMeterIndex,
  validateOccupantPhone,
  validatePaymentDueDays,
  validateStartDate,
} from '@/utils/contractForm'

const TODAY = '2026-11-07'

describe('validateMeterIndex', () => {
  it('nhận số nguyên và số có tối đa 2 số lẻ, cả dấu phẩy', () => {
    expect(validateMeterIndex('1180')).toBe(true)
    expect(validateMeterIndex('1182,5')).toBe(true)
    expect(validateMeterIndex('76.25')).toBe(true)
    expect(validateMeterIndex('0')).toBe(true)
  })

  it('từ chối rỗng, số âm, 3 số lẻ và vượt numeric(12,2)', () => {
    expect(validateMeterIndex('')).toBe('Vui lòng nhập chỉ số.')
    expect(validateMeterIndex('-1')).not.toBe(true)
    expect(validateMeterIndex('1,125')).not.toBe(true)
    expect(validateMeterIndex('10000000000')).not.toBe(true)
  })
})

describe('validatePaymentDueDays', () => {
  it('chỉ nhận số nguyên từ 1 tới 30', () => {
    expect(validatePaymentDueDays('1')).toBe(true)
    expect(validatePaymentDueDays('30')).toBe(true)
    expect(validatePaymentDueDays('0')).not.toBe(true)
    expect(validatePaymentDueDays('31')).not.toBe(true)
    expect(validatePaymentDueDays('5,5')).not.toBe(true)
  })
})

describe('ngày bắt đầu, kết thúc', () => {
  it('ngày bắt đầu không trước hôm nay', () => {
    expect(validateStartDate('2026-11-07', TODAY)).toBe(true)
    expect(validateStartDate('2026-11-06', TODAY)).toBe('Ngày bắt đầu không được trước hôm nay.')
  })

  it('ngày kết thúc phải sau ngày bắt đầu', () => {
    expect(validateEndDate('2027-11-06', '2026-11-07')).toBe(true)
    expect(validateEndDate('2026-11-07', '2026-11-07')).toBe('Ngày kết thúc phải sau ngày bắt đầu.')
  })
})

describe('validateOccupantPhone', () => {
  it('bỏ trống được; có thì theo định dạng số Việt Nam', () => {
    expect(validateOccupantPhone('')).toBe(true)
    expect(validateOccupantPhone('0912345678')).toBe(true)
    expect(validateOccupantPhone('912345678')).not.toBe(true)
  })
})

describe('getMaxCoOccupants', () => {
  it('người đứng tên chiếm một chỗ', () => {
    expect(getMaxCoOccupants(3)).toBe(2)
    expect(getMaxCoOccupants(1)).toBe(0)
  })
})

describe('toContractTermsRequest', () => {
  it('dọn số tiền, chỉ số, tên và số điện thoại trống', () => {
    expect(
      toContractTermsRequest({
        rentPrice: '3.000.000',
        electricityUnitPrice: '3500',
        waterUnitPrice: '15000',
        depositAmount: '3.000.000',
        initialElectricityIndex: '1182,5',
        initialWaterIndex: '76',
        startDate: '2026-11-10',
        endDate: '2027-11-09',
        paymentDueDays: ' 7 ',
        serviceFees: [{ name: ' Rác ', amount: '50.000' }],
        occupants: [
          { fullName: ' Trần Thị B ', phoneNumber: '' },
          { fullName: 'Lê Văn C', phoneNumber: ' 0912345678 ' },
        ],
      }),
    ).toEqual({
      rentPrice: 3000000,
      electricityUnitPrice: 3500,
      waterUnitPrice: 15000,
      depositAmount: 3000000,
      initialElectricityIndex: 1182.5,
      initialWaterIndex: 76,
      startDate: '2026-11-10',
      endDate: '2027-11-09',
      paymentDueDays: 7,
      serviceFees: [{ name: 'Rác', amount: 50000 }],
      occupants: [
        { fullName: 'Trần Thị B', phoneNumber: null },
        { fullName: 'Lê Văn C', phoneNumber: '0912345678' },
      ],
    })
  })
})

const room = {
  rentPrice: 3200000,
  electricityUnitPrice: 3500,
  waterUnitPrice: 15000,
  serviceFees: [{ name: 'Rác', amount: 25000 }],
} as RoomDetail

describe('getNewContractFormValues', () => {
  it('điền giá, phí từ phòng và chỉ số cuối của phòng', () => {
    const values = getNewContractFormValues(room, { electricityIndex: 1180.5, waterIndex: 76 }, '2026-11-15', TODAY)
    expect(values.rentPrice).toBe('3200000')
    expect(values.serviceFees).toEqual([{ name: 'Rác', amount: '25000' }])
    expect(values.initialElectricityIndex).toBe('1180,5')
    expect(values.initialWaterIndex).toBe('76')
    expect(values.startDate).toBe('2026-11-15')
    expect(values.depositAmount).toBe('')
  })

  it('phòng chưa từng có hợp đồng thì để trống chỉ số; ngày vào ở đã qua thì để trống ngày bắt đầu', () => {
    const values = getNewContractFormValues(room, null, '2026-11-01', TODAY)
    expect(values.initialElectricityIndex).toBe('')
    expect(values.initialWaterIndex).toBe('')
    expect(values.startDate).toBe('')
  })
})

describe('getContractFormValues', () => {
  it('người ở cùng không có số điện thoại thì để chuỗi rỗng', () => {
    const values = getContractFormValues({
      rentPrice: 3000000,
      electricityUnitPrice: 3500,
      waterUnitPrice: 15000,
      depositAmount: 0,
      initialElectricityIndex: 1182.5,
      initialWaterIndex: 76,
      startDate: '2026-11-10',
      endDate: '2027-11-09',
      paymentDueDays: 7,
      serviceFees: [],
      occupants: [{ fullName: 'Trần Thị B', phoneNumber: null }],
    } as unknown as ContractDetail)
    expect(values.depositAmount).toBe('0')
    expect(values.initialElectricityIndex).toBe('1182,5')
    expect(values.occupants).toEqual([{ fullName: 'Trần Thị B', phoneNumber: '' }])
  })
})
