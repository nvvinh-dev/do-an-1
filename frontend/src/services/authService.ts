import { api } from '@/lib/api'
import type {
  CurrentUser,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  ResetPasswordRequest,
} from '@/types/authTypes'

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await api.get<CurrentUser>('/auth/me')
  return response.data
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', request)
  return response.data
}

// Luôn trả 200 với cùng một thông báo, dù email có tồn tại hay không (security-design mục 6, 8).
export async function forgotPassword(request: ForgotPasswordRequest): Promise<void> {
  await api.post('/auth/forgot-password', request)
}

export async function resetPassword(request: ResetPasswordRequest): Promise<void> {
  await api.post('/auth/reset-password', request)
}
