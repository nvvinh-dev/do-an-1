import { useMutation, useQueryClient } from '@tanstack/react-query'
import { rentalRequestsQueryKey } from '@/hooks/useRentalRequestList'
import { getApiErrorInfo } from '@/lib/apiError'
import { cancelRentalRequest } from '@/services/rentalRequestService'

/**
 * Người thuê rút yêu cầu. Thành công thì làm mới mọi dữ liệu yêu cầu thuê vì trạng thái đổi ở cả
 * danh sách lẫn chi tiết. `409` nghĩa là yêu cầu đã đổi trạng thái ở nơi khác (Chủ trọ vừa duyệt,
 * từ chối, lập hợp đồng, hoặc đã quá hạn): cũng tải lại để trang hiện đúng trạng thái mới.
 */
export function useCancelRentalRequest(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => cancelRentalRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rentalRequestsQueryKey }),
    onError: (error) => {
      if (getApiErrorInfo(error).status === 409) {
        void queryClient.invalidateQueries({ queryKey: rentalRequestsQueryKey })
      }
    },
  })
}
