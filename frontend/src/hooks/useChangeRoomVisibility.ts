import { useMutation, useQueryClient } from '@tanstack/react-query'
import { roomsQueryKey } from '@/hooks/useRoomList'
import { changeRoomVisibility } from '@/services/roomService'
import type { LandlordRoomVisibilityStatus } from '@/types/roomTypes'

/** Bật/tắt hiển thị đổi `visibilityStatus` và `isListed`, hiện ở cả chi tiết phòng lẫn danh sách phòng của khu. */
export function useChangeRoomVisibility(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (visibilityStatus: LandlordRoomVisibilityStatus) => changeRoomVisibility(id, visibilityStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: roomsQueryKey }),
  })
}
