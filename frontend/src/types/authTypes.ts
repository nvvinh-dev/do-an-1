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

/** Response của `POST /auth/login` (docs/api-design.md mục 2). `user` cùng kiểu với `GET /auth/me`. */
export interface LoginResponse {
  accessToken: string
  expiresAt: string
  user: CurrentUser
}

/** Body của `POST /auth/register` (docs/api-design.md mục 2). Tài khoản mới luôn nhận vai trò Tenant. */
export interface RegisterRequest {
  email: string
  password: string
  fullName: string
  phoneNumber?: string
}

/** Body của `POST /auth/forgot-password` (docs/api-design.md mục 2). Luôn trả `200`. */
export interface ForgotPasswordRequest {
  email: string
}

/**
 * Body của `POST /auth/reset-password` (docs/api-design.md mục 2). `email` và `token` đọc từ
 * đường dẫn trong email (`/reset-password?email=...&token=...`); trả `204 No Content`.
 */
export interface ResetPasswordRequest {
  email: string
  token: string
  newPassword: string
}

/** Body của `PUT /auth/me` (docs/api-design.md mục 2). Đổi `phoneNumber` thì mất trạng thái đã xác thực (BR-01). */
export interface UpdateProfileRequest {
  fullName: string
  phoneNumber?: string
}

/** Body của `POST /auth/change-password` (docs/api-design.md mục 2). */
export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}
