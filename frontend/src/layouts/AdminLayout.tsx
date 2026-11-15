import { FileCheck, History, LayoutDashboard, Users } from 'lucide-react'
import SidebarLayout, { type SidebarNavItem } from '@/layouts/SidebarLayout'

// Mục và thứ tự theo docs/frontend-screens.md mục 1. Không có chuông và mục Thông báo:
// Phase 1 không gửi thông báo nào cho Admin.
const menuItems: SidebarNavItem[] = [
  { label: 'Tổng quan', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Hồ sơ Chủ trọ', to: '/admin/landlord-applications', icon: FileCheck },
  { label: 'Tài khoản', to: '/admin/users', icon: Users },
  { label: 'Nhật ký', to: '/admin/audit-logs', icon: History },
]

export default function AdminLayout() {
  return <SidebarLayout homePath="/admin" items={menuItems} showNotificationBell={false} />
}
