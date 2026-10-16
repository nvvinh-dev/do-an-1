import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { getAccessToken } from '@/lib/api'
import { getCurrentUser } from '@/services/authService'
import type { CurrentUser } from '@/types/authTypes'

/** Đăng nhập, đăng xuất và sửa hồ sơ cập nhật thẳng dữ liệu dưới khóa này. */
export const currentUserQueryKey = ['auth', 'me'] as const

/** `null` nghĩa là chưa đăng nhập: không có token, hoặc token đã hết hạn. */
async function fetchCurrentUser(): Promise<CurrentUser | null> {
  if (!getAccessToken()) {
    return null
  }

  try {
    return await getCurrentUser()
  } catch (error) {
    // lib/api.ts đã xóa token khi gặp 401.
    if (isAxiosError(error) && error.response?.status === 401) {
      return null
    }
    throw error
  }
}

/**
 * Tài khoản đang đăng nhập. Chỉ gọi `GET /auth/me` một lần mỗi lần tải trang:
 * vai trò chỉ đổi khi đăng nhập lại (docs/api-design.md mục 3).
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: fetchCurrentUser,
    staleTime: Infinity,
  })
}
