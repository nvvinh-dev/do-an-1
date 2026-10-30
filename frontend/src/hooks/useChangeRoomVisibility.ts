import { useMutation, useQueryClient } from '@tanstack/react-query'
import { roomsQueryKey } from '@/hooks/useRoomList'
import { getApiErrorInfo } from '@/lib/apiError'
import { changeRoomVisibility } from '@/services/roomService'
import type { LandlordRoomVisibilityStatus } from '@/types/roomTypes'

/**
 * Bật/tắt hiển thị đổi `visibilityStatus` và `isListed`, hiện ở cả chi tiết phòng lẫn danh sách phòng của khu.
 * `409` nghĩa là phòng đã lưu trữ ở tab hay máy khác, hoặc tin vừa bị Admin ẩn: tải lại phòng để trang
 * hiện đúng. `422` (chưa có ảnh) thì phòng không đổi, không cần tải lại.
 */
export function useChangeRoomVisibility(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (visibilityStatus: LandlordRoomVisibilityStatus) => changeRoomVisibility(id, visibilityStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomsQueryKey }),
    onError: (error) => {
      if (getApiErrorInfo(error).status === 409) {
        void queryClient.invalidateQueries({ queryKey: roomsQueryKey })
      }
    },
  })
}
