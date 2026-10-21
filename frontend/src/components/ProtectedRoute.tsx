import { Navigate, Outlet, useLocation } from 'react-router'
import { useCurrentUser } from '../hooks/useCurrentUser'
import type { UserRole } from '../types/authTypes'
import { getRoleHomePath } from '../utils/getRoleHomePath'

interface ProtectedRouteProps {
  /** Bỏ trống thì chỉ cần đăng nhập, vai trò nào cũng vào được. */
  role?: UserRole
}

/**
 * Chặn nhóm route theo đăng nhập và vai trò (docs/frontend-screens.md mục 1).
 * Chỉ để trải nghiệm: backend vẫn kiểm tra quyền ở mọi request (Kiến trúc mục 8).
 */
export default function ProtectedRoute({ role }: ProtectedRouteProps) {
  const location = useLocation()
  const { data: user, isPending, isError, refetch } = useCurrentUser()

  if (isPending) {
    return <p className="p-6 text-slate-600">Đang tải...</p>
  }

  if (isError) {
    return (
      <div className="p-6">
        <p className="text-slate-700">Không tải được thông tin tài khoản.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Thử lại
        </button>
      </div>
    )
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  if (role && !user.roles.includes(role)) {
    return <Navigate to={getRoleHomePath(user.roles)} replace />
  }

  return <Outlet />
}
