import {
  BadgeCheck,
  Bell,
  CircleUser,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Search,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import AccountMenu from '@/components/AccountMenu'
import AppLogo from '@/components/AppLogo'
import NotificationBell from '@/components/NotificationBell'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useLogout } from '@/hooks/useLogout'
import { cn } from '@/lib/utils'

// Mục và thứ tự theo docs/frontend-screens.md mục 1.
const menuItems = [
  { label: 'Tìm phòng', to: '/', icon: Search, end: true },
  { label: 'Tổng quan', to: '/tenant', icon: LayoutDashboard, end: true },
  { label: 'Yêu cầu thuê', to: '/tenant/rental-requests', icon: ClipboardList, end: false },
  { label: 'Hợp đồng', to: '/tenant/contracts', icon: FileText, end: false },
  { label: 'Hóa đơn', to: '/tenant/invoices', icon: Receipt, end: false },
  { label: 'Đăng ký làm Chủ trọ', to: '/tenant/landlord-application', icon: BadgeCheck, end: false },
  { label: 'Thông báo', to: '/notifications', icon: Bell, end: false },
]

function menuLinkClass(isActive: boolean) {
  return cn(
    'flex items-center gap-3 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors',
    isActive
      ? 'bg-accent text-primary'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  )
}

/**
 * Khung của Người thuê (docs/design-system.md mục 5): dưới lg menu nằm trong sheet,
 * từ lg menu ngang trên thanh trên.
 */
export default function TenantLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const logout = useLogout()
  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 md:px-6 lg:px-8">
          <AppLogo to="/tenant" />

          <nav aria-label="Menu chính" className="hidden items-center gap-1 lg:flex">
            {menuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn(menuLinkClass(isActive), 'h-10 px-2.5')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <div className="hidden lg:block">
              <AccountMenu />
            </div>

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Mở menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 gap-2" aria-describedby={undefined}>
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                {/* Màn hình thấp (điện thoại xoay ngang) không chứa hết menu nên phần dưới tiêu đề tự cuộn. */}
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-4">
                  <nav aria-label="Menu chính" className="flex flex-col gap-1 px-2">
                    {menuItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={closeMenu}
                        className={({ isActive }) => cn(menuLinkClass(isActive), 'h-11')}
                      >
                        <item.icon className="size-5" />
                        {item.label}
                      </NavLink>
                    ))}
                  </nav>
                  <Separator className="my-2" />
                  <div className="flex flex-col gap-1 px-2">
                    <NavLink
                      to="/account"
                      onClick={closeMenu}
                      className={({ isActive }) => cn(menuLinkClass(isActive), 'h-11')}
                    >
                      <CircleUser className="size-5" />
                      Tài khoản của tôi
                    </NavLink>
                    <button
                      type="button"
                      onClick={logout}
                      className={cn(menuLinkClass(false), 'h-11')}
                    >
                      <LogOut className="size-5" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
