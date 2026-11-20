import { CircleUser, LogOut, type LucideIcon } from 'lucide-react'
import { Link, matchPath, Outlet, useLocation } from 'react-router'
import AppLogo from '@/components/AppLogo'
import NavCountBadge from '@/components/NavCountBadge'
import NavIconChip, { type NavTint } from '@/components/NavIconChip'
import NotificationBell from '@/components/NotificationBell'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useLogout } from '@/hooks/useLogout'
import { cn } from '@/lib/utils'
import { getUserRoleLabel } from '@/utils/userRoleLabels'

export interface SidebarNavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Sắc của ô icon (docs/design-system.md mục 4). */
  tint: NavTint
  /** Chỉ sáng khi đúng đường dẫn này, không sáng ở trang con (dùng cho Tổng quan). */
  end?: boolean
  /** Số việc đang chờ ở mục này; không có hoặc bằng 0 thì không hiện. */
  count?: number
  /** Đọc kèm số đếm cho trình đọc màn hình. */
  countLabel?: string
}

export interface SidebarNavGroup {
  /** Nhãn nhóm; nhóm đầu (Tổng quan) không có nhãn. */
  label?: string
  items: readonly SidebarNavItem[]
}

interface SidebarLayoutProps {
  homePath: string
  groups: readonly SidebarNavGroup[]
  showNotificationBell: boolean
}

// Mục menu cao 44px; mục đang chọn có nền teal nhạt, chữ đậm và vạch trái 4px (docs/design-system.md mục 5).
const navLinkClass = cn(
  'relative flex h-11 w-full items-center gap-3 rounded-xl pr-2.5 pl-2 text-sm font-medium text-sidebar-foreground outline-none transition-colors',
  'hover:bg-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring',
)
const activeLinkClass = cn(
  'bg-sidebar-accent font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent',
  'before:absolute before:top-2.5 before:bottom-2.5 before:-left-2 before:w-1 before:rounded-r before:bg-primary',
)

function SidebarNav({ homePath, groups }: Pick<SidebarLayoutProps, 'homePath' | 'groups'>) {
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
      <SidebarContent className="gap-1">
        {groups.map((group, index) => (
          <SidebarGroup key={group.label ?? index} className="py-1">
            {group.label && (
              <SidebarGroupLabel className="h-7 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const isActive = matchPath({ path: item.to, end: item.end ?? false }, pathname) !== null
                  return (
                    <SidebarMenuItem key={item.to}>
                      <Link
                        to={item.to}
                        onClick={closeOnMobile}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(navLinkClass, isActive && activeLinkClass)}
                      >
                        <NavIconChip icon={item.icon} tint={item.tint} active={isActive} />
                        <span className="truncate">{item.label}</span>
                        <NavCountBadge count={item.count ?? 0} label={item.countLabel ?? ''} />
                      </Link>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-1 border-t border-sidebar-border">
        <div className="px-2 py-1 text-sm">
          <p className="truncate font-semibold">{user?.fullName}</p>
          <p className="truncate text-muted-foreground">{user?.roles[0] ? getUserRoleLabel(user.roles[0]) : null}</p>
        </div>
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <Link
              to="/account"
              onClick={closeOnMobile}
              aria-current={pathname === '/account' ? 'page' : undefined}
              className={cn(navLinkClass, 'h-10 pl-3', pathname === '/account' && activeLinkClass)}
            >
              <CircleUser className="size-5" />
              <span>Tài khoản của tôi</span>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <button type="button" onClick={logout} className={cn(navLinkClass, 'h-10 pl-3')}>
              <LogOut className="size-5" />
              <span>Đăng xuất</span>
            </button>
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
export default function SidebarLayout({ homePath, groups, showNotificationBell }: SidebarLayoutProps) {
  return (
    <SidebarProvider>
      <SidebarNav homePath={homePath} groups={groups} />
      <SidebarInset>
        <header
          className={cn(
            'sticky top-0 z-10 flex h-16 items-center gap-2 border-b bg-card px-4 md:px-6 lg:px-8',
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
