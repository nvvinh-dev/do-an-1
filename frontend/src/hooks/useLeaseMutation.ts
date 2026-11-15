import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { contractsQueryKey } from '@/hooks/useContractList'
import { landlordDashboardQueryKey } from '@/hooks/useLandlordDashboard'
import { propertiesQueryKey } from '@/hooks/usePropertyList'
import { rentalRequestsQueryKey } from '@/hooks/useRentalRequestList'
import { roomsQueryKey } from '@/hooks/useRoomList'
import { getApiErrorInfo } from '@/lib/apiError'

/**
 * Duyệt, từ chối yêu cầu thuê và mọi thao tác trên hợp đồng đều có thể đổi trạng thái của yêu cầu
 * thuê, hợp đồng và phòng cùng lúc (phòng Đang giữ chỗ, Đang thuê, về Trống), kéo theo số phòng theo
 * trạng thái ở khu trọ và dashboard. Làm mới cả nhóm dữ liệu này.
 */
export function invalidateLeaseQueries(queryClient: QueryClient) {
  return Promise.all(
    [rentalRequestsQueryKey, contractsQueryKey, roomsQueryKey, propertiesQueryKey, landlordDashboardQueryKey].map(
      (queryKey) => queryClient.invalidateQueries({ queryKey }),
    ),
  )
}

/**
 * Thao tác của Chủ trọ trên yêu cầu thuê và hợp đồng (L5, L6). Thành công thì làm mới dữ liệu liên
 * quan. `409` nghĩa là trạng thái đã đổi ở nơi khác (người thuê vừa rút, đồng ý, hủy; đã quá hạn):
 * cũng tải lại để trang hiện nút theo trạng thái mới (docs/frontend-screens.md mục 1).
 *
 * `onSuccess` chạy trước khi làm mới dữ liệu và chạy cả khi component đã gỡ. Form lập hợp đồng chuyển
 * trang ở đây: nếu chờ dữ liệu tải lại, yêu cầu thuê đã sang `DaLapHopDong` và trang form bị thay bằng
 * thông báo chặn trước khi kịp chuyển.
 */
export function useLeaseMutation<TVariables = void, TData = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: { onSuccess?: (data: TData) => void },
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      options?.onSuccess?.(data)
      return invalidateLeaseQueries(queryClient)
    },
    onError: (error) => {
      if (getApiErrorInfo(error).status === 409) {
        void invalidateLeaseQueries(queryClient)
      }
    },
  })
}
