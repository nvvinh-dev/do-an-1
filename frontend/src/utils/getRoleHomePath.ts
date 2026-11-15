import type { UserRole } from '@/types/authTypes'

const ROLE_HOME_PATHS: Record<UserRole, string> = {
  Tenant: '/tenant',
  Landlord: '/landlord',
  Admin: '/admin',
}

/** Trang chủ của vai trò (docs/frontend-screens.md mục 1). Không có vai trò thì về trang chủ chung. */
export function getRoleHomePath(roles: readonly UserRole[]): string {
  return roles.length > 0 ? ROLE_HOME_PATHS[roles[0]] : '/'
}
