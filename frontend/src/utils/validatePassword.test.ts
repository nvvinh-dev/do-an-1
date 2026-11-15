import { describe, expect, it } from 'vitest'
import { validatePassword } from '@/utils/validatePassword'

describe('validatePassword', () => {
  it('nhận mật khẩu đủ chữ hoa, chữ thường, chữ số và ký tự đặc biệt', () => {
    expect(validatePassword('MatKhau123!')).toBeNull()
  })

  it('chặn mật khẩu dưới 8 ký tự', () => {
    expect(validatePassword('Abc12!')).toBe('Mật khẩu tối thiểu 8 ký tự.')
  })

  it('chặn mật khẩu toàn chữ thường và số, không có chữ hoa và ký tự đặc biệt', () => {
    expect(validatePassword('matkhau123')).toBe(
      'Mật khẩu phải có chữ hoa, chữ thường, chữ số và ký tự đặc biệt.',
    )
  })

  it('chặn thiếu chữ hoa', () => {
    expect(validatePassword('matkhau123!')).not.toBeNull()
  })

  it('chặn thiếu chữ thường', () => {
    expect(validatePassword('MATKHAU123!')).not.toBeNull()
  })

  it('chặn thiếu chữ số', () => {
    expect(validatePassword('MatKhauAbc!')).not.toBeNull()
  })

  // Identity (PasswordValidator<TUser>) chỉ coi A-Z, a-z, 0-9 là chữ và số theo dải ASCII, nên
  // chữ có dấu tiếng Việt không được tính là chữ hoa/chữ thường mà tính là ký tự đặc biệt.
  it('chữ có dấu tiếng Việt được tính là ký tự đặc biệt, không phải chữ thường', () => {
    expect(validatePassword('MatKhau123đ')).toBeNull()
    expect(validatePassword('MATKHAU123Đ')).toBe(
      'Mật khẩu phải có chữ hoa, chữ thường, chữ số và ký tự đặc biệt.',
    )
  })
})
