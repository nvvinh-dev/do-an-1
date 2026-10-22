import { api } from '@/lib/api'
import type { CurrentUser } from '@/types/authTypes'

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await api.get<CurrentUser>('/auth/me')
  return response.data
}
