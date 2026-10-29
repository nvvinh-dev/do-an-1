import { describe, expect, it } from 'vitest'
import {
  normalizeRoomArea,
  normalizeRoomMoney,
  validateRoomArea,
  validateRoomMoney,
  validateRoomOccupants,
  validateServiceFeeName,
} from './validateRoomInput'

describe('dữ liệu số của phòng', () => {
  it('cho phép phí miễn phí nhưng giá thuê phải lớn hơn 0', () => {
    expect(validateRoomMoney('0')).toBe(true)
    expect(validateRoomMoney('0', true)).not.toBe(true)
    expect(validateRoomMoney('3000000', true)).toBe(true)
  })

  it.each(['', '-1', '3.5', '3,5', '1e6', 'abc', '1000000000000'])('từ chối tiền không hợp lệ: %s', (value) => {
    expect(validateRoomMoney(value)).not.toBe(true)
  })

  it('giới hạn tiền theo 12 chữ số và không làm tròn tiền nhập', () => {
    expect(validateRoomMoney('999999999999')).toBe(true)
    expect(validateRoomMoney('3500.5')).not.toBe(true)
  })

  it('nhận tiền gõ có dấu chấm hàng nghìn, không nhận dấu chấm ở chỗ khác', () => {
    expect(normalizeRoomMoney(' 3.000.000 ')).toBe('3000000')
    expect(validateRoomMoney('3.000.000', true)).toBe(true)
    expect(validateRoomMoney('15.000')).toBe(true)
    for (const value of ['3.5', '3.00', '3000.000.5', '.300', '3..000', '3.000,5']) {
      expect(validateRoomMoney(value)).not.toBe(true)
    }
  })

  it('diện tích nhận tối đa 2 số lẻ và 6 số nguyên', () => {
    expect(validateRoomArea('20.5')).toBe(true)
    expect(validateRoomArea('999999.99')).toBe(true)
    for (const value of ['', '0', '-20', '20.555', '1000000', 'abc']) {
      expect(validateRoomArea(value)).not.toBe(true)
    }
  })

  it('diện tích nhận dấu phẩy thập phân', () => {
    expect(normalizeRoomArea('20,5')).toBe('20.5')
    expect(validateRoomArea('20,55')).toBe(true)
    expect(validateRoomArea('20,555')).not.toBe(true)
    expect(validateRoomArea('1,000.5')).not.toBe(true)
  })

  it('số người bắt buộc là số nguyên dương trong giới hạn API', () => {
    expect(validateRoomOccupants('2')).toBe(true)
    for (const value of ['', '0', '-1', '1.5', '2147483648']) {
      expect(validateRoomOccupants(value)).not.toBe(true)
    }
  })
})

describe('tên phí dịch vụ', () => {
  it('không trùng sau khi bỏ khoảng trắng và không phân biệt hoa thường', () => {
    expect(validateServiceFeeName(' Wifi ', ['Wifi', ' wifi '], 0)).not.toBe(true)
    expect(validateServiceFeeName('Rác', ['Rác', 'Wifi'], 0)).toBe(true)
    expect(validateServiceFeeName(' ', [' '], 0)).not.toBe(true)
    expect(validateServiceFeeName('a'.repeat(101), [], 0)).not.toBe(true)
    expect(validateServiceFeeName(` ${'a'.repeat(100)} `, [], 0)).toBe(true)
  })
})
