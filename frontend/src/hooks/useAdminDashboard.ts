import { useQuery } from '@tanstack/react-query'
import { getAdminDashboard } from '@/services/dashboardService'

export const adminDashboardQueryKey = ['dashboard', 'admin'] as const

/** Tổng quan toàn hệ thống cho Admin (AD1). */
export function useAdminDashboard() {
  return useQuery({
    queryKey: adminDashboardQueryKey,
    queryFn: getAdminDashboard,
  })
}
