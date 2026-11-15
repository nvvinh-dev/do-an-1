import { useQuery } from '@tanstack/react-query'
import { getLandlordDashboard } from '@/services/dashboardService'

export const landlordDashboardQueryKey = ['dashboard', 'landlord'] as const

/** Tổng quan của Chủ trọ đang đăng nhập (L1). */
export function useLandlordDashboard() {
  return useQuery({
    queryKey: landlordDashboardQueryKey,
    queryFn: getLandlordDashboard,
  })
}
