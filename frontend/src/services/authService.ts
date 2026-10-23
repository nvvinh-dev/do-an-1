import { api } from '@/lib/api'
import type { CurrentUser, LoginRequest, LoginResponse } from '@/types/authTypes'

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await api.get<CurrentUser>('/auth/me')
  return response.data
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', request)
  return response.data
}
