import { useMutation, useQueryClient } from '@tanstack/react-query'
import { propertiesQueryKey } from '@/hooks/usePropertyList'
import { roomsQueryKey } from '@/hooks/useRoomList'
import { getApiErrorInfo } from '@/lib/apiError'
import { archiveRoom } from '@/services/roomService'

/**
 * `409` nghĩa là phòng đã đổi trạng thái ở tab hay máy khác (Chủ trọ duyệt một yêu cầu thuê nên phòng
 * sang Đang giữ chỗ, hoặc phòng đã lưu trữ): tải lại phòng để trang hiện đúng trạng thái mới.
 */
export function useArchiveRoom(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => archiveRoom(id),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: roomsQueryKey }),
        // `roomCounts` của khu trọ không tính phòng đã lưu trữ (API mục 5.1).
        queryClient.invalidateQueries({ queryKey: propertiesQueryKey }),
      ]),
    onError: (error) => {
      if (getApiErrorInfo(error).status === 409) {
        void queryClient.invalidateQueries({ queryKey: roomsQueryKey })
      }
    },
  })
}
