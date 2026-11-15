import { describe, expect, it } from 'vitest'
import { normalizeSearchText } from '@/utils/normalizeSearchText'

describe('normalizeSearchText', () => {
  it('bỏ dấu, đổi đ thành d và về chữ thường', () => {
    expect(normalizeSearchText('Phường Ba Đình')).toBe('phuong ba dinh')
    expect(normalizeSearchText('Xã Đắk Nhau')).toBe('xa dak nhau')
    expect(normalizeSearchText('ĐẶC KHU CÔN ĐẢO')).toBe('dac khu con dao')
  })

  it('chữ dựng sẵn (NFC) và chữ tổ hợp (NFD) cho cùng kết quả', () => {
    expect(normalizeSearchText('Hòa'.normalize('NFC'))).toBe(normalizeSearchText('Hòa'.normalize('NFD')))
  })

  it('gộp khoảng trắng thừa và bỏ khoảng trắng hai đầu', () => {
    expect(normalizeSearchText('  Phường   Sài  Gòn ')).toBe('phuong sai gon')
  })
})
