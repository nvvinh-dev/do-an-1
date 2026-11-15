import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminUsersQueryKey } from '@/hooks/useUserList'
import { getApiErrorInfo } from '@/lib/apiError'
import { unlockUser } from '@/services/userAdminService'

/**
 * Admin mở khóa tài khoản. Thành công hoặc `409` (tài khoản đã được mở khóa ở tab khác) thì làm
 * mới danh sách để trang hiện đúng trạng thái.
 */
export function useUnlockUser(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => unlockUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminUsersQueryKey }),
    onError: (error) => {
      if (getApiErrorInfo(error).status === 409) {
        void queryClient.invalidateQueries({ queryKey: adminUsersQueryKey })
      }
    },
  })
}
