import { api } from '@/lib/api'
import type { CurrentUser, LoginRequest, LoginResponse, RegisterRequest } from '@/types/authTypes'

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await api.get<CurrentUser>('/auth/me')
  return response.data
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
