import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminLandlordApplicationsQueryKey } from '@/hooks/useLandlordApplicationList'
import { getApiErrorInfo } from '@/lib/apiError'
import { rejectLandlordApplication } from '@/services/landlordApplicationService'
import type { RejectLandlordApplicationRequest } from '@/types/landlordApplicationTypes'

/**
 * Admin từ chối hồ sơ kèm lý do. Thành công hoặc `409` (hồ sơ đã được xử lý ở tab khác) thì làm
 * mới mọi dữ liệu hồ sơ phía Admin để trang hiện đúng trạng thái.
 */
export function useRejectLandlordApplication(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: RejectLandlordApplicationRequest) => rejectLandlordApplication(id, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminLandlordApplicationsQueryKey }),
    onError: (error) => {
      if (getApiErrorInfo(error).status === 409) {
        void queryClient.invalidateQueries({ queryKey: adminLandlordApplicationsQueryKey })
      }
    },
  })
}
