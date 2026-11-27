import { Bell, Building2, FileSignature, KeyRound, LayoutGrid, ReceiptText, WalletCards, Wrench } from 'lucide-react'
import { useLandlordDashboard } from '@/hooks/useLandlordDashboard'
import SidebarLayout, { type SidebarNavGroup } from '@/layouts/SidebarLayout'

/**
 * Mục, thứ tự và nhóm theo docs/frontend-screens.md mục 1; icon và sắc theo docs/design-system.md mục 4.
 * Số đếm lấy từ `pendingActions` của dashboard (dùng chung query với L1); lỗi tải thì không hiện số.
 */
export default function LandlordLayout() {
  const { data: dashboard } = useLandlordDashboard()
  const pending = dashboard?.pendingActions

  const groups: SidebarNavGroup[] = [
    { items: [{ label: 'Tổng quan', to: '/landlord', icon: LayoutGrid, tint: 'teal', end: true }] },
    {
      label: 'Cho thuê',
      items: [
        { label: 'Khu trọ', to: '/landlord/properties', icon: Building2, tint: 'sky' },
        {
          label: 'Yêu cầu thuê',
          to: '/landlord/rental-requests',
          icon: KeyRound,
          tint: 'violet',
          count: pending?.rentalRequests,
          countLabel: 'yêu cầu thuê chờ duyệt',
          countSearch: '?status=ChoDuyet',
        },
        { label: 'Hợp đồng', to: '/landlord/contracts', icon: FileSignature, tint: 'indigo' },
      ],
    },
    {
      label: 'Vận hành',
      items: [
        {
          label: 'Hóa đơn',
          to: '/landlord/invoices',
          icon: ReceiptText,
          tint: 'amber',
          count: pending?.paymentReports,
          countLabel: 'báo thanh toán chờ xác nhận',
          countSearch: '?status=ChoXacNhan',
        },
        {
          label: 'Sự cố',
          to: '/landlord/maintenance-requests',
          icon: Wrench,
          tint: 'rose',
          count: pending?.newMaintenanceRequests,
          countLabel: 'sự cố mới',
          countSearch: '?status=Moi',
        },
      ],
    },
    {
      label: 'Tài khoản',
      items: [
        { label: 'Tài khoản nhận tiền', to: '/landlord/bank-account', icon: WalletCards, tint: 'emerald' },
        { label: 'Thông báo', to: '/notifications', icon: Bell, tint: 'slate' },
      ],
    },
  ]

  return <SidebarLayout homePath="/landlord" groups={groups} showNotificationBell />
}
