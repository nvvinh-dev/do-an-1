import {
  BadgeCheck,
  Bell,
  ChevronDown,
  CircleUser,
  FileSignature,
  KeyRound,
  LayoutGrid,
  LogOut,
  MailOpen,
  Menu,
  ReceiptText,
  Search,
  UserRoundSearch,
  UsersRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import AccountMenu from '@/components/AccountMenu'
import AppLogo from '@/components/AppLogo'
import NavIconChip, { type NavTint } from '@/components/NavIconChip'
import NotificationBell from '@/components/NotificationBell'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useLogout } from '@/hooks/useLogout'
import { cn } from '@/lib/utils'

interface TenantNavItem {
  label: string
  to: string
  icon: LucideIcon
  tint: NavTint
  end: boolean
}

interface TenantNavGroup {
  label?: string
  items: TenantNavItem[]
  /**
   * Trên menu ngang (từ xl) cả nhóm là một mục thả xuống mang tên nhóm, vì đủ mười một mục thì không vừa
   * một hàng trong khung 1152px (docs/design-system.md mục 5). Menu trong sheet vẫn liệt kê từng mục.
   */
  collapsedOnBar?: boolean
}

// Mục, thứ tự và nhóm theo docs/frontend-screens.md mục 1; icon và sắc theo docs/design-system.md mục 4.
const menuGroups: TenantNavGroup[] = [
  {
    items: [
      { label: 'Tìm phòng', to: '/', icon: Search, tint: 'slate', end: true },
      { label: 'Tổng quan', to: '/tenant', icon: LayoutGrid, tint: 'teal', end: true },
    ],
  },
  {
    label: 'Thuê phòng',
    items: [
      { label: 'Yêu cầu thuê', to: '/tenant/rental-requests', icon: KeyRound, tint: 'violet', end: false },
      { label: 'Hợp đồng', to: '/tenant/contracts', icon: FileSignature, tint: 'indigo', end: false },
    ],
  },
  {
    label: 'Vận hành',
    items: [
      { label: 'Hóa đơn', to: '/tenant/invoices', icon: ReceiptText, tint: 'amber', end: false },
      { label: 'Sự cố', to: '/tenant/maintenance-requests', icon: Wrench, tint: 'rose', end: false },
    ],
  },
  {
    label: 'Tài khoản',
    items: [
      { label: 'Đăng ký làm Chủ trọ', to: '/tenant/landlord-application', icon: BadgeCheck, tint: 'emerald', end: false },
      { label: 'Thông báo', to: '/notifications', icon: Bell, tint: 'slate', end: false },
    ],
  },
  {
    label: 'Ở ghép',
    collapsedOnBar: true,
    items: [
      { label: 'Hồ sơ ở ghép', to: '/tenant/roommate/profile', icon: UserRoundSearch, tint: 'violet', end: false },
      // `end`: `/tenant/roommate` là tiền tố của hai mục còn lại.
      { label: 'Tìm bạn ở ghép', to: '/tenant/roommate', icon: UsersRound, tint: 'violet', end: true },
      { label: 'Lời mời ở ghép', to: '/tenant/roommate/invitations', icon: MailOpen, tint: 'violet', end: false },
    ],
  },
]
// Menu ngang: các nhóm `collapsedOnBar` thành một mục thả xuống, còn lại từng mục như trong sheet.
type BarEntry = TenantNavItem | { group: string; items: TenantNavItem[] }
const barEntries = menuGroups.flatMap((group): BarEntry[] =>
  group.collapsedOnBar && group.label ? [{ group: group.label, items: group.items }] : group.items,
)

const barLinkClass = (isActive: boolean) =>
  cn(
    'flex items-center gap-1 border-b-2 px-2.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
    isActive
      ? 'border-primary font-semibold text-primary'
      : 'border-transparent font-medium text-muted-foreground hover:text-foreground',
  )

/**
 * Một nhóm trên menu ngang dạng mục thả xuống: gạch chân như mục đang chọn khi trang hiện tại thuộc nhóm.
 * Mục trong danh sách thả xuống giữ ô icon có sắc như trong sheet.
 */
function BarGroupMenu({ label, items }: { label: string; items: TenantNavItem[] }) {
  const { pathname } = useLocation()
  const isActive = items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(barLinkClass(isActive), 'cursor-pointer')}>
        {label}
        <ChevronDown className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {items.map((item) => (
          <DropdownMenuItem key={item.to} asChild className="min-h-10">
            <NavLink to={item.to} end={item.end}>
              {({ isActive: itemActive }) => (
                <>
                  <NavIconChip icon={item.icon} tint={item.tint} active={itemActive} />
                  <span className={cn(itemActive && 'font-semibold')}>{item.label}</span>
                </>
              )}
            </NavLink>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Menu trong sheet giống sidebar của Chủ trọ: mục cao 44px, mục chọn nền teal nhạt và vạch trái.
function sheetLinkClass(isActive: boolean) {
  return cn(
    'relative flex h-11 items-center gap-3 rounded-xl pr-2.5 pl-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
    isActive
      ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground before:absolute before:top-2.5 before:bottom-2.5 before:-left-2 before:w-1 before:rounded-r before:bg-primary'
      : 'text-foreground hover:bg-accent',
  )
}

/**
 * Khung của Người thuê (docs/design-system.md mục 5): dưới xl menu nằm trong sheet, chia nhóm và có
 * ô icon màu; từ xl menu ngang chỉ có chữ trên thanh trên, mục đang chọn gạch chân màu chính.
 */
export default function TenantLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const logout = useLogout()
  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 md:px-6 lg:px-8">
          <AppLogo to="/tenant" />

          <nav aria-label="Menu chính" className="hidden h-full items-stretch gap-1 xl:flex">
            {barEntries.map((entry) =>
              'group' in entry ? (
                <BarGroupMenu key={entry.group} label={entry.group} items={entry.items} />
              ) : (
                <NavLink
                  key={entry.to}
                  to={entry.to}
                  end={entry.end}
                  className={({ isActive }) => barLinkClass(isActive)}
                >
                  {entry.label}
                </NavLink>
              ),
            )}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <div className="hidden xl:block">
              <AccountMenu />
            </div>

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="xl:hidden" aria-label="Mở menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 gap-2 bg-sidebar" aria-describedby={undefined}>
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                {/* Màn hình thấp (điện thoại xoay ngang) không chứa hết menu nên phần dưới tiêu đề tự cuộn. */}
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-4">
                  <nav aria-label="Menu chính" className="flex flex-col gap-3 px-3">
                    {menuGroups.map((group, index) => (
                      <div key={group.label ?? index} className="flex flex-col gap-0.5">
                        {group.label && (
                          <p className="px-2 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            {group.label}
                          </p>
                        )}
                        {group.items.map((item) => (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={closeMenu}
                            className={({ isActive }) => sheetLinkClass(isActive)}
                          >
                            {({ isActive }) => (
                              <>
                                <NavIconChip icon={item.icon} tint={item.tint} active={isActive} />
                                {item.label}
                              </>
                            )}
                          </NavLink>
                        ))}
                      </div>
                    ))}
                  </nav>
                  <Separator className="my-3" />
                  <div className="flex flex-col gap-0.5 px-3">
                    <NavLink
                      to="/account"
                      onClick={closeMenu}
                      className={({ isActive }) => cn(sheetLinkClass(isActive), 'h-10 pl-3')}
                    >
                      <CircleUser className="size-5" />
                      Tài khoản của tôi
                    </NavLink>
                    <button type="button" onClick={logout} className={cn(sheetLinkClass(false), 'h-10 pl-3')}>
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
