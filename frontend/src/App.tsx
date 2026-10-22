import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import ProtectedRoute from '@/components/ProtectedRoute'
import AdminLayout from '@/layouts/AdminLayout'
import CurrentRoleLayout from '@/layouts/CurrentRoleLayout'
import LandlordLayout from '@/layouts/LandlordLayout'
import PublicLayout from '@/layouts/PublicLayout'
import TenantLayout from '@/layouts/TenantLayout'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AuditLogPage from '@/pages/admin/AuditLogPage'
import LandlordApplicationListPage from '@/pages/admin/LandlordApplicationListPage'
import LandlordApplicationReviewPage from '@/pages/admin/LandlordApplicationReviewPage'
import UserListPage from '@/pages/admin/UserListPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import BankAccountPage from '@/pages/landlord/BankAccountPage'
import ContractFormPage from '@/pages/landlord/ContractFormPage'
import InvoiceFormPage from '@/pages/landlord/InvoiceFormPage'
import LandlordContractDetailPage from '@/pages/landlord/LandlordContractDetailPage'
import LandlordContractListPage from '@/pages/landlord/LandlordContractListPage'
import LandlordDashboardPage from '@/pages/landlord/LandlordDashboardPage'
import LandlordInvoiceDetailPage from '@/pages/landlord/LandlordInvoiceDetailPage'
import LandlordInvoiceListPage from '@/pages/landlord/LandlordInvoiceListPage'
import LandlordRentalRequestDetailPage from '@/pages/landlord/LandlordRentalRequestDetailPage'
import LandlordRentalRequestListPage from '@/pages/landlord/LandlordRentalRequestListPage'
import LandlordRoomDetailPage from '@/pages/landlord/LandlordRoomDetailPage'
import PropertyDetailPage from '@/pages/landlord/PropertyDetailPage'
import PropertyFormPage from '@/pages/landlord/PropertyFormPage'
import PropertyListPage from '@/pages/landlord/PropertyListPage'
import RoomFormPage from '@/pages/landlord/RoomFormPage'
import SettlementPage from '@/pages/landlord/SettlementPage'
import NotFoundPage from '@/pages/public/NotFoundPage'
import RoomPublicDetailPage from '@/pages/public/RoomPublicDetailPage'
import SearchPage from '@/pages/public/SearchPage'
import AccountPage from '@/pages/shared/AccountPage'
import NotificationsPage from '@/pages/shared/NotificationsPage'
import LandlordApplicationPage from '@/pages/tenant/LandlordApplicationPage'
import TenantContractDetailPage from '@/pages/tenant/TenantContractDetailPage'
import TenantContractListPage from '@/pages/tenant/TenantContractListPage'
import TenantDashboardPage from '@/pages/tenant/TenantDashboardPage'
import TenantInvoiceDetailPage from '@/pages/tenant/TenantInvoiceDetailPage'
import TenantInvoiceListPage from '@/pages/tenant/TenantInvoiceListPage'
import TenantRentalRequestDetailPage from '@/pages/tenant/TenantRentalRequestDetailPage'
import TenantRentalRequestListPage from '@/pages/tenant/TenantRentalRequestListPage'

// Đường dẫn và file trang theo docs/frontend-screens.md mục 2–7; layout theo mục 1.
// Đường dẫn lạ trong nhóm của một vai trò vẫn qua kiểm tra vai trò trước khi tới NotFoundPage.
const router = createBrowserRouter([
  // Khách và mọi vai trò
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <SearchPage /> },
      { path: '/rooms/:id', element: <RoomPublicDetailPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },

  // Dùng chung, hiện trong layout của vai trò đang đăng nhập
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <CurrentRoleLayout />,
        children: [
          { path: '/account', element: <AccountPage /> },
          // Admin không có màn Thông báo (docs/frontend-screens.md mục 1, 8.4)
          {
            element: <ProtectedRoute roles={['Tenant', 'Landlord']} />,
            children: [{ path: '/notifications', element: <NotificationsPage /> }],
          },
        ],
      },
    ],
  },

  {
    path: '/tenant',
    element: <ProtectedRoute roles={['Tenant']} />,
    children: [
      {
        element: <TenantLayout />,
        children: [
          { index: true, element: <TenantDashboardPage /> },
          { path: 'landlord-application', element: <LandlordApplicationPage /> },
          { path: 'rental-requests', element: <TenantRentalRequestListPage /> },
          { path: 'rental-requests/:id', element: <TenantRentalRequestDetailPage /> },
          { path: 'contracts', element: <TenantContractListPage /> },
          { path: 'contracts/:id', element: <TenantContractDetailPage /> },
          { path: 'invoices', element: <TenantInvoiceListPage /> },
          { path: 'invoices/:id', element: <TenantInvoiceDetailPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },

  {
    path: '/landlord',
    element: <ProtectedRoute roles={['Landlord']} />,
    children: [
      {
        element: <LandlordLayout />,
        children: [
          { index: true, element: <LandlordDashboardPage /> },
          { path: 'properties', element: <PropertyListPage /> },
          { path: 'properties/new', element: <PropertyFormPage /> },
          { path: 'properties/:id', element: <PropertyDetailPage /> },
          { path: 'properties/:id/edit', element: <PropertyFormPage /> },
          { path: 'properties/:propertyId/rooms/new', element: <RoomFormPage /> },
          { path: 'rooms/:id', element: <LandlordRoomDetailPage /> },
          { path: 'rooms/:id/edit', element: <RoomFormPage /> },
          { path: 'bank-account', element: <BankAccountPage /> },
          { path: 'rental-requests', element: <LandlordRentalRequestListPage /> },
          { path: 'rental-requests/:id', element: <LandlordRentalRequestDetailPage /> },
          { path: 'contracts', element: <LandlordContractListPage /> },
          { path: 'contracts/new', element: <ContractFormPage /> },
          { path: 'contracts/:id', element: <LandlordContractDetailPage /> },
          { path: 'contracts/:id/edit', element: <ContractFormPage /> },
          { path: 'contracts/:id/invoices/new', element: <InvoiceFormPage /> },
          { path: 'contracts/:id/settlement', element: <SettlementPage /> },
          { path: 'invoices', element: <LandlordInvoiceListPage /> },
          { path: 'invoices/:id', element: <LandlordInvoiceDetailPage /> },
          { path: 'invoices/:id/edit', element: <InvoiceFormPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },

  {
    path: '/admin',
    element: <ProtectedRoute roles={['Admin']} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'landlord-applications', element: <LandlordApplicationListPage /> },
          { path: 'landlord-applications/:id', element: <LandlordApplicationReviewPage /> },
          { path: 'users', element: <UserListPage /> },
          { path: 'audit-logs', element: <AuditLogPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
