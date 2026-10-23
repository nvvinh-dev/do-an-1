import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setAccessToken } from '@/lib/api'
import { currentUserQueryKey } from '@/lib/queryClient'
import { getCurrentUser, login } from '@/services/authService'
import type { LoginRequest } from '@/types/authTypes'

/**
 * Đăng nhập: lưu token rồi lấy tài khoản từ `GET /auth/me` và ghi vào khóa tài khoản hiện tại.
 * Response đăng nhập không có số điện thoại, nên không dùng nó làm tài khoản đang đăng nhập.
 * Chuyển trang do LoginPage làm khi thấy đã có tài khoản.
 */
export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: LoginRequest) => {
      const { accessToken } = await login(request)
      setAccessToken(accessToken)
      try {
        return await getCurrentUser()
      } catch (error) {
        // Không để lại token của một lần đăng nhập chưa xong.
        setAccessToken(null)
        throw error
      }
    },
    onSuccess: (user) => {
      queryClient.setQueryData(currentUserQueryKey, user)
    },
  })
}
