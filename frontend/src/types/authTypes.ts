/** Tên vai trò, trùng với `AppRoles` ở backend. Mỗi tài khoản có đúng một vai trò (FR-08). */
export type UserRole = 'Tenant' | 'Landlord' | 'Admin'

/** Response của `GET /auth/me` (docs/api-design.md mục 2). */
export interface CurrentUser {
  id: number
  email: string
  fullName: string
  phoneNumber: string | null
  roles: UserRole[]
}
