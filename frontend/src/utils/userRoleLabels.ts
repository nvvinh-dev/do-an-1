import type { UserRole } from '@/types/authTypes'

const USER_ROLE_LABELS: Record<UserRole, string> = {
  Tenant: 'Người thuê',
  Landlord: 'Chủ trọ',
  Admin: 'Admin',
}

/** Nhãn tiếng Việt của vai trò tài khoản. */
export function getUserRoleLabel(role: UserRole): string {
  return USER_ROLE_LABELS[role]
}
