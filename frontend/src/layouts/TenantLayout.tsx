import {
  BadgeCheck,
  Bell,
  FileSignature,
  KeyRound,
  LayoutGrid,
  MailOpen,
  ReceiptText,
  Search,
  UserRoundSearch,
  UsersRound,
  Wrench,
} from 'lucide-react'
import SidebarLayout, { type SidebarNavGroup } from '@/layouts/SidebarLayout'

// Mục, thứ tự và nhóm theo docs/frontend-screens.md mục 1; icon và sắc theo docs/design-system.md mục 4.
const groups: SidebarNavGroup[] = [
  {
    items: [
      { label: 'Tìm phòng', to: '/', icon: Search, tint: 'slate', end: true },
      { label: 'Tổng quan', to: '/tenant', icon: LayoutGrid, tint: 'teal', end: true },
    ],
  },
  {
    label: 'Thuê phòng',
    items: [
      { label: 'Yêu cầu thuê', to: '/tenant/rental-requests', icon: KeyRound, tint: 'violet' },
      { label: 'Hợp đồng', to: '/tenant/contracts', icon: FileSignature, tint: 'indigo' },
    ],
  },
  {
    label: 'Vận hành',
    items: [
      { label: 'Hóa đơn', to: '/tenant/invoices', icon: ReceiptText, tint: 'amber' },
      { label: 'Sự cố', to: '/tenant/maintenance-requests', icon: Wrench, tint: 'rose' },
    ],
  },
  {
    label: 'Tài khoản',
    items: [
      { label: 'Đăng ký làm Chủ trọ', to: '/tenant/landlord-application', icon: BadgeCheck, tint: 'emerald' },
      { label: 'Thông báo', to: '/notifications', icon: Bell, tint: 'slate' },
    ],
  },
  {
    label: 'Ở ghép',
    items: [
      { label: 'Hồ sơ ở ghép', to: '/tenant/roommate/profile', icon: UserRoundSearch, tint: 'violet' },
      // `end`: `/tenant/roommate` là tiền tố của hai mục còn lại.
      { label: 'Tìm bạn ở ghép', to: '/tenant/roommate', icon: UsersRound, tint: 'violet', end: true },
      { label: 'Lời mời ở ghép', to: '/tenant/roommate/invitations', icon: MailOpen, tint: 'violet' },
    ],
  },
]

/** Khung của Người thuê: dùng chung sidebar với Chủ trọ, Admin (docs/design-system.md mục 5), có chuông thông báo. */
export default function TenantLayout() {
  return <SidebarLayout homePath="/tenant" groups={groups} showNotificationBell />
}
