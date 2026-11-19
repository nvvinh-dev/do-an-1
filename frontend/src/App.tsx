import { createBrowserRouter, type RouteObject } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import adminHouseKeys from '@/assets/admin-house-keys.jpg'
import adminLaptopDesk from '@/assets/admin-laptop-desk.jpg'
import authPasswordLocks from '@/assets/auth-password-locks.png'
import authRegisterLivingRoom from '@/assets/auth-register-living-room.jpg'
import authStudioRoom from '@/assets/auth-studio-room.jpg'
import contractSigningDocuments from '@/assets/contract-signing-documents.jpg'
import invoiceCalculatorMoney from '@/assets/invoice-calculator-money.jpg'
import landlordApartmentFacade from '@/assets/landlord-apartment-facade.jpg'
import propertyApartmentRoofs from '@/assets/property-apartment-roofs.jpg'
import searchSaigonStreet from '@/assets/search-saigon-street.jpg'
import tenantBedroom from '@/assets/tenant-bedroom.jpg'
import ProtectedRoute from '@/components/ProtectedRoute'
import RouteErrorFallback from '@/components/RouteErrorFallback'
import type { ScreenHandle } from '@/components/ScreenBackground'
import { Toaster } from '@/components/ui/sonner'
import AdminLayout from '@/layouts/AdminLayout'
import AuthLayout from '@/layouts/AuthLayout'
import CurrentRoleLayout from '@/layouts/CurrentRoleLayout'
import LandlordLayout from '@/layouts/LandlordLayout'
import PublicLayout from '@/layouts/PublicLayout'
import RootLayout from '@/layouts/RootLayout'
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

/** Ảnh nền mờ của màn hình, `ScreenBackground` đọc từ `handle` của route sâu nhất (docs/design-system.md mục 11). */
const bg = (background: string): ScreenHandle => ({ background })

// Đường dẫn và file trang theo docs/frontend-screens.md mục 2–7; layout theo mục 1.
// Đường dẫn lạ trong nhóm của một vai trò vẫn qua kiểm tra vai trò trước khi tới NotFoundPage.
const routes: RouteObject[] = [
  // Khách và mọi vai trò
  {
    element: <PublicLayout />,
    // Lỗi ở chính khung (thanh trên) thì thay cả khung.
    errorElement: <RouteErrorFallback />,
    children: [
      {
        // Lỗi khi vẽ một trang chỉ thay phần nội dung, giữ thanh trên để sang trang khác.
        errorElement: <RouteErrorFallback />,
        children: [
          { path: '/', element: <SearchPage />, handle: bg(searchSaigonStreet) },
          { path: '/rooms/:id', element: <RoomPublicDetailPage />, handle: bg(searchSaigonStreet) },
          {
            // Bốn màn xác thực có ảnh bên cạnh form.
            element: <AuthLayout />,
            children: [
              { path: '/login', element: <LoginPage />, handle: bg(authStudioRoom) },
              { path: '/register', element: <RegisterPage />, handle: bg(authRegisterLivingRoom) },
              { path: '/forgot-password', element: <ForgotPasswordPage />, handle: bg(authPasswordLocks) },
              { path: '/reset-password', element: <ResetPasswordPage />, handle: bg(authPasswordLocks) },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },

  // Dùng chung, hiện trong layout của vai trò đang đăng nhập
  {
    element: <ProtectedRoute />,
    // Lỗi ở chính khung của vai trò đang đăng nhập thì thay cả khung.
    errorElement: <RouteErrorFallback />,
    children: [
      {
        element: <CurrentRoleLayout />,
        children: [
          {
            // Lỗi khi vẽ một trang chỉ thay phần nội dung, giữ menu để sang trang khác.
            errorElement: <RouteErrorFallback />,
            children: [
              { path: '/account', element: <AccountPage />, handle: bg(authRegisterLivingRoom) },
              // Admin không có màn Thông báo (docs/frontend-screens.md mục 1, 8.4)
              {
                element: <ProtectedRoute roles={['Tenant', 'Landlord']} />,
                children: [{ path: '/notifications', element: <NotificationsPage />, handle: bg(authRegisterLivingRoom) }],
              },
            ],
          },
        ],
      },
    ],
  },

  {
    path: '/tenant',
    element: <ProtectedRoute roles={['Tenant']} />,
    // Lỗi ở chính khung (thanh trên, chuông thông báo) thì thay cả khung.
    errorElement: <RouteErrorFallback />,
    children: [
      {
        element: <TenantLayout />,
        children: [
          {
            // Lỗi khi vẽ một trang chỉ thay phần nội dung, giữ menu để sang trang khác.
            errorElement: <RouteErrorFallback />,
            children: [
              { index: true, element: <TenantDashboardPage />, handle: bg(tenantBedroom) },
              { path: 'landlord-application', element: <LandlordApplicationPage /> },
              { path: 'rental-requests', element: <TenantRentalRequestListPage />, handle: bg(contractSigningDocuments) },
              { path: 'rental-requests/:id', element: <TenantRentalRequestDetailPage />, handle: bg(contractSigningDocuments) },
              { path: 'contracts', element: <TenantContractListPage />, handle: bg(contractSigningDocuments) },
              { path: 'contracts/:id', element: <TenantContractDetailPage />, handle: bg(contractSigningDocuments) },
              { path: 'invoices', element: <TenantInvoiceListPage />, handle: bg(invoiceCalculatorMoney) },
              { path: 'invoices/:id', element: <TenantInvoiceDetailPage />, handle: bg(invoiceCalculatorMoney) },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },

  {
    path: '/landlord',
    element: <ProtectedRoute roles={['Landlord']} />,
    // Lỗi ở chính khung (thanh bên, chuông thông báo) thì thay cả khung.
    errorElement: <RouteErrorFallback />,
    children: [
      {
        element: <LandlordLayout />,
        children: [
          {
            // Lỗi khi vẽ một trang chỉ thay phần nội dung, giữ menu để sang trang khác.
            errorElement: <RouteErrorFallback />,
            children: [
              { index: true, element: <LandlordDashboardPage />, handle: bg(landlordApartmentFacade) },
              { path: 'properties', element: <PropertyListPage />, handle: bg(propertyApartmentRoofs) },
              { path: 'properties/new', element: <PropertyFormPage />, handle: bg(propertyApartmentRoofs) },
              { path: 'properties/:id', element: <PropertyDetailPage />, handle: bg(propertyApartmentRoofs) },
              { path: 'properties/:id/edit', element: <PropertyFormPage />, handle: bg(propertyApartmentRoofs) },
              { path: 'properties/:propertyId/rooms/new', element: <RoomFormPage />, handle: bg(propertyApartmentRoofs) },
              { path: 'rooms/:id', element: <LandlordRoomDetailPage />, handle: bg(propertyApartmentRoofs) },
              { path: 'rooms/:id/edit', element: <RoomFormPage />, handle: bg(propertyApartmentRoofs) },
              { path: 'bank-account', element: <BankAccountPage />, handle: bg(invoiceCalculatorMoney) },
              { path: 'rental-requests', element: <LandlordRentalRequestListPage />, handle: bg(contractSigningDocuments) },
              { path: 'rental-requests/:id', element: <LandlordRentalRequestDetailPage />, handle: bg(contractSigningDocuments) },
              { path: 'contracts', element: <LandlordContractListPage />, handle: bg(contractSigningDocuments) },
              { path: 'contracts/new', element: <ContractFormPage />, handle: bg(contractSigningDocuments) },
              { path: 'contracts/:id', element: <LandlordContractDetailPage />, handle: bg(contractSigningDocuments) },
              { path: 'contracts/:id/edit', element: <ContractFormPage />, handle: bg(contractSigningDocuments) },
              { path: 'contracts/:id/invoices/new', element: <InvoiceFormPage />, handle: bg(invoiceCalculatorMoney) },
              { path: 'contracts/:id/settlement', element: <SettlementPage />, handle: bg(contractSigningDocuments) },
              { path: 'invoices', element: <LandlordInvoiceListPage />, handle: bg(invoiceCalculatorMoney) },
              { path: 'invoices/:id', element: <LandlordInvoiceDetailPage />, handle: bg(invoiceCalculatorMoney) },
              { path: 'invoices/:id/edit', element: <InvoiceFormPage />, handle: bg(invoiceCalculatorMoney) },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },

  {
    path: '/admin',
    element: <ProtectedRoute roles={['Admin']} />,
    // Lỗi ở chính khung (thanh bên) thì thay cả khung.
    errorElement: <RouteErrorFallback />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            // Lỗi khi vẽ một trang chỉ thay phần nội dung, giữ menu để sang trang khác.
            errorElement: <RouteErrorFallback />,
            children: [
              { index: true, element: <AdminDashboardPage />, handle: bg(adminHouseKeys) },
              { path: 'landlord-applications', element: <LandlordApplicationListPage />, handle: bg(adminLaptopDesk) },
              { path: 'landlord-applications/:id', element: <LandlordApplicationReviewPage />, handle: bg(adminLaptopDesk) },
              { path: 'users', element: <UserListPage />, handle: bg(adminLaptopDesk) },
              { path: 'audit-logs', element: <AuditLogPage />, handle: bg(adminLaptopDesk) },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]

// `RootLayout` bọc mọi route để gắn `ScrollRestoration` một lần cho cả ứng dụng.
const router = createBrowserRouter([{ element: <RootLayout />, children: routes }])

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      {/* `toast` báo thành công sau khi lưu hoặc đổi trạng thái (docs/design-system.md mục 8). */}
      <Toaster position="top-center" />
    </>
  )
}
