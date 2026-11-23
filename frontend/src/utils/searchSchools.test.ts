import { describe, expect, it } from 'vitest'
import type { School } from '@/types/schoolTypes'
import { searchSchools } from '@/utils/searchSchools'

function school(code: string, name: string, city: string | null, aliases: string[] = []): School {
  return { code, name, type: 'DaiHoc', city, aliases }
}

const UIT = school('uit', 'Trường Đại học Công nghệ Thông tin – ĐHQG TP.HCM', 'TP.HCM', ['VNUHCM - UIT', 'UIT'])
const ICTU = school(
  'ictu',
  'Trường Đại học Công nghệ Thông tin và Truyền thông – Đại học Thái Nguyên',
  'Thái Nguyên',
  ['ICTU'],
)
const HUST = school('hust', 'Đại học Bách khoa Hà Nội', null, ['HUST'])
const HCMUT = school('hcmut', 'Trường Đại học Bách khoa – ĐHQG TP.HCM', 'TP.HCM', ['VNUHCM - UT', 'UT'])
const DUT = school('dut', 'Trường Đại học Bách khoa – Đại học Đà Nẵng', 'Đà Nẵng', ['DUT'])
const SCHOOLS = [ICTU, UIT, DUT, HCMUT, HUST]

describe('searchSchools', () => {
  it('chữ gõ rỗng thì trả đủ danh mục theo thứ tự cũ', () => {
    expect(searchSchools(SCHOOLS, '  ')).toBe(SCHOOLS)
  })

  it('gõ bỏ dấu, chữ thường vẫn khớp; tên ngắn hơn đứng trước khi cùng mức', () => {
    expect(searchSchools(SCHOOLS, 'truong dai hoc cong nghe thong tin')).toEqual([UIT, ICTU])
  })

  it('gõ "bách khoa" ra đủ ba trường Bách khoa', () => {
    expect(searchSchools(SCHOOLS, 'Bách Khoa')).toEqual(expect.arrayContaining([HUST, HCMUT, DUT]))
    expect(searchSchools(SCHOOLS, 'Bách Khoa')).toHaveLength(3)
  })

  it('gõ tên viết tắt thì trường đó đứng đầu', () => {
    expect(searchSchools(SCHOOLS, 'uit')[0]).toBe(UIT)
    expect(searchSchools(SCHOOLS, 'vnuhcm uit')[0]).toBe(UIT)
    expect(searchSchools(SCHOOLS, 'HUST')[0]).toBe(HUST)
  })

  it('từng từ gõ không cần liền nhau, nhận cả tên gọi khác của thành phố', () => {
    expect(searchSchools(SCHOOLS, 'bach khoa hcm')).toEqual([HCMUT])
    expect(searchSchools(SCHOOLS, 'bach khoa ho chi minh')).toEqual([HCMUT])
    expect(searchSchools(SCHOOLS, 'bach khoa da nang')).toEqual([DUT])
  })

  it('không khớp thì trả rỗng', () => {
    expect(searchSchools(SCHOOLS, 'ngoai thuong')).toEqual([])
  })
})
