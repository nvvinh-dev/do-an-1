import { FileUser, History, LayoutGrid, UsersRound } from 'lucide-react'
import { useAdminDashboard } from '@/hooks/useAdminDashboard'
import SidebarLayout, { type SidebarNavGroup } from '@/layouts/SidebarLayout'

/**
 * Mục, thứ tự và nhóm theo docs/frontend-screens.md mục 1; icon và sắc theo docs/design-system.md mục 4.
 * Không có chuông và mục Thông báo: Phase 1 không gửi thông báo nào cho Admin. Số hồ sơ chờ duyệt lấy
 * từ dashboard (dùng chung query với AD1); lỗi tải thì không hiện số.
 */
export default function AdminLayout() {
  const { data: dashboard } = useAdminDashboard()

  const groups: SidebarNavGroup[] = [
    { items: [{ label: 'Tổng quan', to: '/admin', icon: LayoutGrid, tint: 'teal', end: true }] },
    {
      label: 'Quản trị',
      items: [
        {
          label: 'Hồ sơ Chủ trọ',
          to: '/admin/landlord-applications',
          icon: FileUser,
          tint: 'indigo',
          count: dashboard?.pendingLandlordApplications,
          countLabel: 'hồ sơ chờ duyệt',
          countSearch: '?status=ChoDuyet',
        },
        { label: 'Tài khoản', to: '/admin/users', icon: UsersRound, tint: 'emerald' },
        { label: 'Nhật ký', to: '/admin/audit-logs', icon: History, tint: 'slate' },
      ],
    },
  ]

  return <SidebarLayout homePath="/admin" groups={groups} showNotificationBell={false} />
}
