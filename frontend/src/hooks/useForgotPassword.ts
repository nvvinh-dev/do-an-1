import { useMutation } from '@tanstack/react-query'
import { forgotPassword } from '@/services/authService'

/** A3 — không có dữ liệu để lưu vào cache: response luôn giống nhau (docs/api-design.md mục 2). */
export function useForgotPassword() {
  return useMutation({ mutationFn: forgotPassword })
}
