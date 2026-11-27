import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query'
import { landlordDashboardQueryKey } from '@/hooks/useLandlordDashboard'
import { maintenanceRequestsQueryKey } from '@/hooks/useMaintenanceRequestList'
import { tenantDashboardQueryKey } from '@/hooks/useTenantDashboard'
import { getApiErrorInfo } from '@/lib/apiError'

/** Dashboard đếm sự cố mới và sự cố chờ xác nhận, số đó hiện cả trên menu (docs/frontend-screens.md mục 1). */
function invalidateMaintenanceQueries(queryClient: QueryClient) {
  return Promise.all(
    [maintenanceRequestsQueryKey, landlordDashboardQueryKey, tenantDashboardQueryKey].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  )
}

/**
 * Báo sự cố và mọi thao tác chuyển trạng thái sự cố. Thành công thì làm mới mọi dữ liệu sự cố vì
 * trạng thái hiện ở cả danh sách, chi tiết và số đếm của dashboard. `409` nghĩa là sự cố đã đổi ở nơi khác
 * (Chủ trọ vừa tiếp nhận, từ chối, báo sửa xong; hệ thống vừa tự đóng): cũng tải lại để trang hiện nút theo
 * trạng thái mới (docs/frontend-screens.md mục 1).
 */
export function useMaintenanceRequestMutation<TVariables = void, TData = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () => invalidateMaintenanceQueries(queryClient),
    onError: (error) => {
      if (getApiErrorInfo(error).status === 409) {
        void invalidateMaintenanceQueries(queryClient)
      }
    },
  })
}
