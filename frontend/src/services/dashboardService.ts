import { api } from '@/lib/api'
import type { LandlordDashboard } from '@/types/dashboardTypes'

// Số liệu tổng quan theo vai trò (docs/api-design.md mục 12). Mọi số do server tính.

export async function getLandlordDashboard(): Promise<LandlordDashboard> {
  const response = await api.get<LandlordDashboard>('/dashboard/landlord')
  return response.data
}
