import { useMutation, useQueryClient } from '@tanstack/react-query'
import { maintenanceRequestsQueryKey } from '@/hooks/useMaintenanceRequestList'
import { getApiErrorInfo } from '@/lib/apiError'

/**
 * Báo sự cố và mọi thao tác chuyển trạng thái sự cố. Thành công thì làm mới mọi dữ liệu sự cố vì
 * trạng thái hiện ở cả danh sách lẫn chi tiết. `409` nghĩa là sự cố đã đổi ở nơi khác (Chủ trọ vừa
 * tiếp nhận, từ chối, báo sửa xong; hệ thống vừa tự đóng): cũng tải lại để trang hiện nút theo
 * trạng thái mới (docs/frontend-screens.md mục 1).
 */
export function useMaintenanceRequestMutation<TVariables = void, TData = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: maintenanceRequestsQueryKey }),
    onError: (error) => {
      if (getApiErrorInfo(error).status === 409) {
        void queryClient.invalidateQueries({ queryKey: maintenanceRequestsQueryKey })
      }
    },
  })
}
