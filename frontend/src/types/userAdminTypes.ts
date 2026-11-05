import type { UserRole } from '@/types/authTypes'

/** Vai trò trên bộ lọc của AD3, theo thứ tự hiện trong danh sách chọn. */
export const USER_ROLES = ['Tenant', 'Landlord', 'Admin'] as const satisfies readonly UserRole[]

/** Một tài khoản ở `GET /admin/users` (docs/api-design.md mục 4). */
export interface UserListItem {
  id: number
  email: string
  fullName: string
  phoneNumber: string | null
  isLocked: boolean
  lockReason: string | null
  registeredAt: string
  roles: UserRole[]
  /** Số hợp đồng chưa kết thúc; chỉ tài khoản Chủ trọ có, tài khoản khác là `null`. */
  activeContractCount: number | null
}

export interface UserListParams {
  role?: UserRole
  isLocked?: boolean
  page?: number
}

export interface LockUserRequest {
  reason: string
}
