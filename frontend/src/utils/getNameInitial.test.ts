import { describe, expect, it } from 'vitest'
import { getNameInitial } from './getNameInitial'

describe('getNameInitial', () => {
  it('lấy chữ đầu của tên gọi (từ cuối) và viết hoa', () => {
    expect(getNameInitial('Trần Văn Hùng')).toBe('H')
    expect(getNameInitial('nguyễn thị lan')).toBe('L')
  })

  it('giữ dấu tiếng Việt, kể cả chữ Đ', () => {
    expect(getNameInitial('Lê Đức')).toBe('Đ')
    expect(getNameInitial('Phạm Ánh')).toBe('Á')
  })

  it('bỏ khoảng trắng thừa ở đầu, cuối và giữa các từ', () => {
    expect(getNameInitial('  Giang   Trịnh  ')).toBe('T')
  })

  it('một từ thì lấy chữ đầu của từ đó', () => {
    expect(getNameInitial('An')).toBe('A')
  })

  it('từ cuối là số hoặc ký hiệu thì lùi về từ trước', () => {
    expect(getNameInitial('Chủ trọ Dev 1')).toBe('D')
    expect(getNameInitial('Lan (2)')).toBe('L')
  })

  it('không có chữ cái nào thì trả dấu hỏi', () => {
    expect(getNameInitial('123')).toBe('?')
  })

  it('tên rỗng thì trả dấu hỏi', () => {
    expect(getNameInitial('')).toBe('?')
    expect(getNameInitial('   ')).toBe('?')
  })
})
