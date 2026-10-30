import { useMutation, useQueryClient } from '@tanstack/react-query'
import { propertiesQueryKey } from '@/hooks/usePropertyList'
import { roomsQueryKey } from '@/hooks/useRoomList'
import { changeRoomOccupancyStatus } from '@/services/roomService'
import type { LandlordRoomOccupancyStatus } from '@/types/roomTypes'

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
  })
}
