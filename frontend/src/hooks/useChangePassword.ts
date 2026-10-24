import { useMutation } from '@tanstack/react-query'
import { changePassword } from '@/services/authService'

/** S1: đổi mật khẩu khi đã đăng nhập (FR-05). `POST /auth/change-password` không trả dữ liệu. */
export function useChangePassword() {
  return useMutation({ mutationFn: changePassword })
}
