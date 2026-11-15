import { Bell, Building2, ClipboardList, FileText, Landmark, LayoutDashboard, Receipt } from 'lucide-react'
import SidebarLayout, { type SidebarNavItem } from '@/layouts/SidebarLayout'

// Mục và thứ tự theo docs/frontend-screens.md mục 1.
const menuItems: SidebarNavItem[] = [
  { label: 'Tổng quan', to: '/landlord', icon: LayoutDashboard, end: true },
  { label: 'Khu trọ', to: '/landlord/properties', icon: Building2 },
  { label: 'Yêu cầu thuê', to: '/landlord/rental-requests', icon: ClipboardList },
  { label: 'Hợp đồng', to: '/landlord/contracts', icon: FileText },
  { label: 'Hóa đơn', to: '/landlord/invoices', icon: Receipt },
  { label: 'Tài khoản nhận tiền', to: '/landlord/bank-account', icon: Landmark },
  { label: 'Thông báo', to: '/notifications', icon: Bell },
]

export default function LandlordLayout() {
  return <SidebarLayout homePath="/landlord" items={menuItems} showNotificationBell />
}
