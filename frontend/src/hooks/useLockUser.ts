import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminUsersQueryKey } from '@/hooks/useUserList'
import { getApiErrorInfo } from '@/lib/apiError'
import { lockUser } from '@/services/userAdminService'
import type { LockUserRequest } from '@/types/userAdminTypes'

/**
 * Admin khóa tài khoản kèm lý do. Thành công hoặc `409` (tài khoản đã bị khóa ở tab khác) thì làm
 * mới danh sách để trang hiện đúng trạng thái.
 */
export function useLockUser(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: LockUserRequest) => lockUser(id, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminUsersQueryKey }),
    onError: (error) => {
      if (getApiErrorInfo(error).status === 409) {
        void queryClient.invalidateQueries({ queryKey: adminUsersQueryKey })
      }
    },
  })
}
