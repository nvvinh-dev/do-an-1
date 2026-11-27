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
import { useTenantDashboard } from '@/hooks/useTenantDashboard'
import SidebarLayout, { type SidebarNavGroup } from '@/layouts/SidebarLayout'

/**
 * Khung của Người thuê: dùng chung sidebar với Chủ trọ, Admin (docs/design-system.md mục 5), có chuông thông báo.
 * Mục, thứ tự và nhóm theo docs/frontend-screens.md mục 1; icon và sắc theo docs/design-system.md mục 4. Số đếm lấy
 * từ `pendingActions` của dashboard (dùng chung query với T1); lỗi tải thì không hiện số.
 */
export default function TenantLayout() {
  const { data: dashboard } = useTenantDashboard()
  const pending = dashboard?.pendingActions

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
        // T5 chỉ lọc được một trạng thái, nên số ba trạng thái còn phải trả mở danh sách không lọc.
        {
          label: 'Hóa đơn',
          to: '/tenant/invoices',
          icon: ReceiptText,
          tint: 'amber',
          count: pending?.invoicesToPay,
          countLabel: 'hóa đơn cần thanh toán',
        },
        {
          label: 'Sự cố',
          to: '/tenant/maintenance-requests',
          icon: Wrench,
          tint: 'rose',
          count: pending?.maintenanceToConfirm,
          countLabel: 'sự cố chờ bạn xác nhận',
          countSearch: '?status=ChoNguoiThueXacNhan',
        },
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

  return <SidebarLayout homePath="/tenant" groups={groups} showNotificationBell />
}
