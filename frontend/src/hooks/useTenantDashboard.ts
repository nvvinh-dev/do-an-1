import { useQuery } from '@tanstack/react-query'
import { getTenantDashboard } from '@/services/dashboardService'

export const tenantDashboardQueryKey = ['dashboard', 'tenant'] as const

/** Tổng quan của Người thuê đang đăng nhập (T1). */
export function useTenantDashboard() {
  return useQuery({
    queryKey: tenantDashboardQueryKey,
    queryFn: getTenantDashboard,
  })
}
