import { describe, expect, it } from 'vitest'
import { ACCOUNT_NAME_PATTERN } from '@/utils/bankAccountPatterns'
import { normalizeAccountName } from '@/utils/normalizeAccountName'

describe('normalizeAccountName', () => {
  it('bỏ dấu và viết hoa họ tên gõ có dấu', () => {
    expect(normalizeAccountName('Nguyễn Văn A')).toBe('NGUYEN VAN A')
  })

  it('đổi đ, Đ thành D', () => {
    expect(normalizeAccountName('Đỗ Thị Đào')).toBe('DO THI DAO')
  })

  it('nhận cả chữ dựng sẵn lẫn chữ tổ hợp (NFC, NFD)', () => {
    expect(normalizeAccountName('Trần Hữu Ý'.normalize('NFD'))).toBe('TRAN HUU Y')
    expect(normalizeAccountName('Trần Hữu Ý'.normalize('NFC'))).toBe('TRAN HUU Y')
  })

  it('bỏ khoảng trắng đầu cuối và gộp khoảng trắng giữa các chữ', () => {
    expect(normalizeAccountName('  le   van\tb  ')).toBe('LE VAN B')
  })

  it('kết quả từ họ tên tiếng Việt khớp mẫu backend kiểm tra', () => {
    expect(ACCOUNT_NAME_PATTERN.test(normalizeAccountName('Phạm Thị Ngọc Ánh'))).toBe(true)
  })

  it('giữ nguyên ký tự không phải chữ để ô nhập báo lỗi, không tự xóa', () => {
    expect(normalizeAccountName('Công ty A.B.C')).toBe('CONG TY A.B.C')
    expect(ACCOUNT_NAME_PATTERN.test('CONG TY A.B.C')).toBe(false)
  })
})
