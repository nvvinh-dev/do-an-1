import { useQuery } from '@tanstack/react-query'
import { getUsers } from '@/services/userAdminService'
import type { UserListParams } from '@/types/userAdminTypes'

/** Khóa, mở khóa làm mới cả khóa này: tài khoản đổi trạng thái có thể rời khỏi bộ lọc đang xem. */
export const adminUsersQueryKey = ['admin', 'users'] as const

/** Danh sách tài khoản cho Admin (AD3). */
export function useUserList(params: UserListParams) {
  return useQuery({
    queryKey: [...adminUsersQueryKey, 'list', params],
    queryFn: () => getUsers(params),
  })
}
