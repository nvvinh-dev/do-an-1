import type { UserRole } from '@/types/authTypes'

/** `ClaimTypes.Role` của .NET, là tên claim backend dùng khi phát hành token. */
const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'

function readTokenRoles(token: string): string[] {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const claim: unknown = JSON.parse(atob(payload))[ROLE_CLAIM]
    return Array.isArray(claim) ? claim : typeof claim === 'string' ? [claim] : []
  } catch {
    return []
  }
}

/**
 * Token mang vai trò lúc đăng nhập, còn `GET /auth/me` trả vai trò hiện tại (docs/api-design.md
 * mục 2, 3). Hai bên lệch nghĩa là vai trò đã đổi sau lúc đăng nhập: giao diện theo vai trò mới
 * nhưng API vẫn xét token cũ và trả `403`. Không đọc được vai trò thì không kết luận gì: chỉ để
 * trải nghiệm, backend vẫn kiểm tra quyền ở mọi request.
 */
export function isTokenRoleOutdated(token: string, currentRoles: readonly UserRole[]): boolean {
  const tokenRoles = readTokenRoles(token)
  return tokenRoles.length > 0 && !tokenRoles.some((role) => currentRoles.includes(role as UserRole))
}
