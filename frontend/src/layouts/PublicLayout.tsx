import { Link, Outlet } from 'react-router'
import AppLogo from '@/components/AppLogo'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getRoleHomePath } from '@/utils/getRoleHomePath'

/**
 * Khung của khách, tìm phòng, chi tiết phòng và các màn xác thực (docs/design-system.md mục 5).
 * Người đã đăng nhập vẫn dùng khung này ở P1, P2; hai nút Đăng nhập, Đăng ký thay bằng
 * liên kết về trang chủ của vai trò (docs/frontend-screens.md mục 1).
 */
export default function PublicLayout() {
  const { data: user, isPending } = useCurrentUser()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 md:px-6 lg:px-8">
          <AppLogo to="/" />
          {!isPending && (
            <nav aria-label="Tài khoản" className="flex items-center gap-1">
              {user ? (
                <Button asChild variant="outline">
                  <Link to={getRoleHomePath(user.roles)}>Tổng quan</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" className="px-3 sm:px-4">
                    <Link to="/login">Đăng nhập</Link>
                  </Button>
                  <Button asChild className="px-3 sm:px-4">
                    <Link to="/register">Đăng ký</Link>
                  </Button>
                </>
              )}
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
