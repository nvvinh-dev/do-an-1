import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { endSession, getAccessToken } from '@/lib/api'
import { currentUserQueryKey, queryClient, sessionRoleChangedQueryKey } from '@/lib/queryClient'
import { getCurrentUser } from '@/services/authService'
import type { CurrentUser } from '@/types/authTypes'
import { isTokenRoleOutdated } from '@/utils/isTokenRoleOutdated'

/**
 * `null` nghĩa là chưa đăng nhập: không có token, token đã hết hạn, hoặc token mang vai trò cũ.
 * Token mang vai trò cũ thì API trả `403` ở mọi màn của vai trò mới, nên kết thúc phiên để người
 * dùng đăng nhập lại (docs/frontend-screens.md mục 1).
 */
async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const token = getAccessToken()
  if (!token) {
    return null
  }

  try {
    const user = await getCurrentUser()
    if (isTokenRoleOutdated(token, user.roles)) {
      endSession()
      queryClient.setQueryData(sessionRoleChangedQueryKey, true)
      return null
    }
    return user
  } catch (error) {
    // lib/api.ts đã xóa token khi gặp 401.
    if (isAxiosError(error) && error.response?.status === 401) {
      return null
    }
    throw error
  }
}

/**
 * Tài khoản đang đăng nhập. Chỉ gọi `GET /auth/me` một lần mỗi lần tải trang: trong một lần tải
 * trang, giao diện và token cùng giữ vai trò lúc đăng nhập (docs/api-design.md mục 3).
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: fetchCurrentUser,
    staleTime: Infinity,
  })
}
