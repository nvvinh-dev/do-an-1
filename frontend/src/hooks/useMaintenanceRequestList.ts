import { useQuery } from '@tanstack/react-query'
import { getMaintenanceRequests } from '@/services/maintenanceRequestService'
import type { MaintenanceRequestListParams } from '@/types/maintenanceRequestTypes'

/**
 * Mọi dữ liệu sự cố (danh sách, chi tiết) nằm dưới khóa này: báo, xác nhận, báo chưa đạt, hủy làm
 * mới cả khóa vì trạng thái hiện ở cả danh sách lẫn chi tiết.
 */
export const maintenanceRequestsQueryKey = ['maintenance-requests'] as const

/** Danh sách sự cố theo vai trò của người gọi, mới gửi trước. */
export function useMaintenanceRequestList(params: MaintenanceRequestListParams) {
  return useQuery({
    queryKey: [...maintenanceRequestsQueryKey, 'list', params],
    queryFn: () => getMaintenanceRequests(params),
  })
}
