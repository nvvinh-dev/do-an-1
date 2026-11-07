import { api } from '@/lib/api'
import type { AdminDashboard, LandlordDashboard } from '@/types/dashboardTypes'

// Số liệu tổng quan theo vai trò (docs/api-design.md mục 12). Mọi số do server tính.

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const response = await api.get<AdminDashboard>('/dashboard/admin')
  return response.data
}

export async function getLandlordDashboard(): Promise<LandlordDashboard> {
  const response = await api.get<LandlordDashboard>('/dashboard/landlord')
  return response.data
}
