import { Navigate, Outlet, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { UserRole } from '@/types/authTypes'
import { getRoleHomePath } from '@/utils/getRoleHomePath'

interface ProtectedRouteProps {
  /** Bỏ trống thì chỉ cần đăng nhập, vai trò nào cũng vào được. */
  roles?: readonly UserRole[]
}

/**
 * Chặn nhóm route theo đăng nhập và vai trò (docs/frontend-screens.md mục 1).
 * Chỉ để trải nghiệm: backend vẫn kiểm tra quyền ở mọi request (Kiến trúc mục 8).
 */
export default function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const location = useLocation()
  const { data: user, isPending, isError, refetch } = useCurrentUser()

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground">Không tải được thông tin tài khoản.</p>
        <Button onClick={() => void refetch()}>Thử lại</Button>
      </div>
    )
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  if (roles && !user.roles.some((role) => roles.includes(role))) {
    return <Navigate to={getRoleHomePath(user.roles)} replace />
  }

  return <Outlet />
}
