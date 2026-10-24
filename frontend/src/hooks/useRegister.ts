import { useMutation } from '@tanstack/react-query'
import { register } from '@/services/authService'

/**
 * Đăng ký không đăng nhập luôn — `POST /auth/register` không trả token (docs/api-design.md
 * mục 2). RegisterPage chuyển người dùng sang màn đăng nhập sau khi đăng ký thành công.
 */
export function useRegister() {
  return useMutation({ mutationFn: register })
}
