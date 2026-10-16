import { CircleUser, LogOut, type LucideIcon } from 'lucide-react'
import { Link, matchPath, Outlet, useLocation } from 'react-router'
import AppLogo from '@/components/AppLogo'
import NotificationBell from '@/components/NotificationBell'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useLogout } from '@/hooks/useLogout'
import { cn } from '@/lib/utils'

export interface SidebarNavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Chỉ sáng khi đúng đường dẫn này, không sáng ở trang con (dùng cho Tổng quan). */
  end?: boolean
}

interface SidebarLayoutProps {
  homePath: string
  items: readonly SidebarNavItem[]
  showNotificationBell: boolean
}

// Mục đang chọn dùng màu primary, rê chuột dùng accent (docs/design-system.md mục 2).
const activeItemClass = 'data-active:text-sidebar-primary'

function SidebarNav({ homePath, items }: Pick<SidebarLayoutProps, 'homePath' | 'items'>) {
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()
  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const closeOnMobile = () => setOpenMobile(false)

  return (
    <Sidebar>
      <SidebarHeader className="h-16 justify-center px-4">
        <AppLogo to={homePath} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={matchPath({ path: item.to, end: item.end ?? false }, pathname) !== null}
                    className={activeItemClass}
                  >
                    <Link to={item.to} onClick={closeOnMobile}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-1 text-sm">
          <p className="truncate font-medium">{user?.fullName}</p>
          <p className="truncate text-muted-foreground">{user?.email}</p>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/account'} className={activeItemClass}>
              <Link to="/account" onClick={closeOnMobile}>
                <CircleUser />
                <span>Tài khoản của tôi</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout}>
              <LogOut />
              <span>Đăng xuất</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

/**
 * Khung có sidebar của Chủ trọ và Admin (docs/design-system.md mục 5): từ lg sidebar cố định
 * bên trái, dưới lg sidebar trượt ra từ nút trên thanh trên.
 */
export default function SidebarLayout({ homePath, items, showNotificationBell }: SidebarLayoutProps) {
  return (
    <SidebarProvider>
      <SidebarNav homePath={homePath} items={items} />
      <SidebarInset>
        <header
          className={cn(
            'sticky top-0 z-10 flex h-16 items-center gap-2 border-b bg-background px-4 md:px-6 lg:px-8',
            // Admin không có chuông nên từ lg thanh trên không còn gì để hiện.
            !showNotificationBell && 'lg:hidden',
          )}
        >
          <SidebarTrigger className="lg:hidden" />
          <div className="lg:hidden">
            <AppLogo to={homePath} />
          </div>
          {showNotificationBell && (
            <div className="ml-auto">
              <NotificationBell />
            </div>
          )}
        </header>
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
