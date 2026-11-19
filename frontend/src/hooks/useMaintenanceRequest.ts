import { useQuery } from '@tanstack/react-query'
import { maintenanceRequestsQueryKey } from '@/hooks/useMaintenanceRequestList'
import { getMaintenanceRequest } from '@/services/maintenanceRequestService'

export function maintenanceRequestQueryKey(id: number) {
  return [...maintenanceRequestsQueryKey, 'detail', id] as const
}

/** Chi tiết một sự cố; sự cố không thuộc người gọi trả `404`. */
export function useMaintenanceRequest(id: number) {
  return useQuery({
    queryKey: maintenanceRequestQueryKey(id),
    queryFn: () => getMaintenanceRequest(id),
  })
}
