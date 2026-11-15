import { api } from '@/lib/api'
import type { PagedResponse } from '@/types/paginationTypes'
import type { LockUserRequest, UserListItem, UserListParams } from '@/types/userAdminTypes'

// Các hàm ở file này chỉ Admin gọi được (AD3, docs/api-design.md mục 4).

export async function getUsers(params: UserListParams): Promise<PagedResponse<UserListItem>> {
  const response = await api.get<PagedResponse<UserListItem>>('/admin/users', { params })
  return response.data
}

// `409` khi tài khoản đã bị khóa, `422` khi Admin tự khóa chính mình.
export async function lockUser(id: number, request: LockUserRequest): Promise<void> {
  await api.post(`/admin/users/${id}/lock`, request)
}

// `409` khi tài khoản đang không bị khóa.
export async function unlockUser(id: number): Promise<void> {
  await api.post(`/admin/users/${id}/unlock`)
}
