const MIN_LENGTH = 8

const HAS_UPPERCASE = /[A-Z]/
const HAS_LOWERCASE = /[a-z]/
const HAS_DIGIT = /[0-9]/
const HAS_NON_ALPHANUMERIC = /[^A-Za-z0-9]/

/**
 * Quy tắc mật khẩu của ASP.NET Identity (`Program.cs`, `options.Password`): tối thiểu 8 ký tự,
 * có chữ hoa, chữ thường, chữ số và ký tự không phải chữ/số. `PasswordValidator<TUser>` của
 * Identity tự định nghĩa chữ hoa/chữ thường/chữ số theo dải ASCII (`c >= 'a' && c <= 'z'`...),
 * không dùng `char.IsLower`/`IsUpper` có nhận Unicode của .NET — nên chữ có dấu tiếng Việt
 * ("ă", "đ"...) bị server tính là ký tự đặc biệt, không phải chữ thường. Kiểm ở frontend chỉ để
 * trải nghiệm: server vẫn kiểm tra lại. Trả câu báo lỗi, hoặc `null` khi mật khẩu hợp lệ.
 */
export function validatePassword(password: string): string | null {
  if (password.length < MIN_LENGTH) {
    return `Mật khẩu tối thiểu ${MIN_LENGTH} ký tự.`
  }

  if (
    !HAS_UPPERCASE.test(password) ||
    !HAS_LOWERCASE.test(password) ||
    !HAS_DIGIT.test(password) ||
    !HAS_NON_ALPHANUMERIC.test(password)
  ) {
    return 'Mật khẩu phải có chữ hoa, chữ thường, chữ số và ký tự đặc biệt.'
  }

  return null
}
