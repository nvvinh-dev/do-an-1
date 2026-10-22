import AdminLayout from '@/layouts/AdminLayout'
import LandlordLayout from '@/layouts/LandlordLayout'
import TenantLayout from '@/layouts/TenantLayout'
import { useCurrentUser } from '@/hooks/useCurrentUser'

/**
 * S1 Tài khoản và S2 Thông báo hiện trong layout của vai trò đang đăng nhập
 * (docs/frontend-screens.md mục 1). Luôn nằm dưới ProtectedRoute nên đã có tài khoản.
 */
export default function CurrentRoleLayout() {
  const { data: user } = useCurrentUser()

  if (user?.roles.includes('Admin')) {
    return <AdminLayout />
  }
  if (user?.roles.includes('Landlord')) {
    return <LandlordLayout />
  }
  return <TenantLayout />
}
