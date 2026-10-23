import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setAccessToken } from '@/lib/api'
import { currentUserQueryKey } from '@/lib/queryClient'
import { login } from '@/services/authService'

/**
 * Đăng nhập: lưu token rồi ghi `user` của response vào khóa tài khoản hiện tại — cùng kiểu với
 * `GET /auth/me` nên không cần gọi lại. Chuyển trang do LoginPage làm khi thấy đã có tài khoản.
 */
export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: login,
    onSuccess: (response) => {
      setAccessToken(response.accessToken)
      queryClient.setQueryData(currentUserQueryKey, response.user)
    },
  })
}
