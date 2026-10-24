import { useMutation } from '@tanstack/react-query'
import { resetPassword } from '@/services/authService'

/** A4 — đặt lại mật khẩu xong thì ResetPasswordPage dẫn sang `/login`, không tự đăng nhập. */
export function useResetPassword() {
  return useMutation({ mutationFn: resetPassword })
}
