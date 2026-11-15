import { useMutation, useQueryClient } from '@tanstack/react-query'
import { propertiesQueryKey } from '@/hooks/usePropertyList'
import { roomsQueryKey } from '@/hooks/useRoomList'
import { getApiErrorInfo } from '@/lib/apiError'
import { changeRoomOccupancyStatus } from '@/services/roomService'
import type { LandlordRoomOccupancyStatus } from '@/types/roomTypes'

/**
 * `409` có thể do phòng đã đổi trạng thái ở tab hay máy khác (sang Đang giữ chỗ, Bảo trì, Lưu trữ):
 * tải lại phòng để nút hiện theo trạng thái mới. `409` vì hợp đồng hiện tại chưa kết thúc (BR-08)
 * thì phòng không đổi, tải lại cũng không sao.
 */
export function useChangeRoomOccupancyStatus(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (occupancyStatus: LandlordRoomOccupancyStatus) => changeRoomOccupancyStatus(id, occupancyStatus),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: roomsQueryKey }),
        // Số phòng theo trạng thái trên danh sách và chi tiết khu trọ đổi theo.
        queryClient.invalidateQueries({ queryKey: propertiesQueryKey }),
      ]),
    onError: (error) => {
      if (getApiErrorInfo(error).status === 409) {
        void queryClient.invalidateQueries({ queryKey: roomsQueryKey })
      }
    },
  })
}
