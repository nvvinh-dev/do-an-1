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

/** Body của `POST /auth/login` (docs/api-design.md mục 2). */
export interface LoginRequest {
  email: string
  password: string
}

/** Response của `POST /auth/login`. Chỉ cần `accessToken`; thông tin tài khoản lấy lại từ `GET /auth/me`. */
export interface LoginResponse {
  accessToken: string
  expiresAt: string
}
