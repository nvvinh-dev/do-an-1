import { QueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

/**
 * Tài khoản đang đăng nhập (`GET /auth/me`). Đăng nhập, đăng xuất, hết hạn token và sửa
 * hồ sơ ghi thẳng vào khóa này; `null` nghĩa là chưa đăng nhập.
 */
export const currentUserQueryKey = ['auth', 'me'] as const

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Lỗi 4xx gọi lại vẫn ra kết quả cũ, nên chỉ thử lại lỗi mạng và lỗi 5xx.
      retry: (failureCount, error) => {
        const status = isAxiosError(error) ? error.response?.status : undefined
        return failureCount < 2 && (status === undefined || status >= 500)
      },
    },
  },
})
