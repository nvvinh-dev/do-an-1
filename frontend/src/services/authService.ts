import { api } from '@/lib/api'
import type {
  ChangePasswordRequest,
  CurrentUser,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ResetPasswordRequest,
  UpdateProfileRequest,
} from '@/types/authTypes'

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await api.get<CurrentUser>('/auth/me')
  return response.data
}

export async function updateProfile(request: UpdateProfileRequest): Promise<CurrentUser> {
  const response = await api.put<CurrentUser>('/auth/me', request)
  return response.data
}

export async function changePassword(request: ChangePasswordRequest): Promise<void> {
  await api.post('/auth/change-password', request)
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', request)
  return response.data
}

// Không trả token (api-design mục 2) — đăng ký xong vẫn phải đăng nhập riêng.
export async function register(request: RegisterRequest): Promise<CurrentUser> {
  const response = await api.post<CurrentUser>('/auth/register', request)
  return response.data
}

// Luôn trả 200 với cùng một thông báo, dù email có tồn tại hay không (security-design mục 6, 8).
export async function forgotPassword(request: ForgotPasswordRequest): Promise<void> {
  await api.post('/auth/forgot-password', request)
}

export async function resetPassword(request: ResetPasswordRequest): Promise<void> {
  await api.post('/auth/reset-password', request)
}
