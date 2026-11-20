import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { adminDashboardQueryKey } from '@/hooks/useAdminDashboard'
import { adminLandlordApplicationsQueryKey } from '@/hooks/useLandlordApplicationList'
import { getApiErrorInfo } from '@/lib/apiError'
import { approveLandlordApplication } from '@/services/landlordApplicationService'
import type { ApproveLandlordApplicationRequest } from '@/types/landlordApplicationTypes'

/**
 * Admin duyệt hồ sơ. Thành công thì làm mới mọi dữ liệu hồ sơ phía Admin. `409` có thể do hồ sơ
 * đã được xử lý ở tab khác hoặc người nộp vừa đổi số điện thoại: cũng tải lại để trang hiện trạng
 * thái và số điện thoại mới.
 */
export function useApproveLandlordApplication(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: ApproveLandlordApplicationRequest) => approveLandlordApplication(id, request),
    onSuccess: () => invalidateReviewQueries(queryClient),
    onError: (error) => {
      if (getApiErrorInfo(error).status === 409) {
        void invalidateReviewQueries(queryClient)
      }
    },
  })
}

/** Duyệt hay từ chối đều đổi danh sách hồ sơ và số hồ sơ chờ duyệt trên dashboard, menu của Admin. */
export function invalidateReviewQueries(queryClient: QueryClient) {
  return Promise.all(
    [adminLandlordApplicationsQueryKey, adminDashboardQueryKey].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  )
}
