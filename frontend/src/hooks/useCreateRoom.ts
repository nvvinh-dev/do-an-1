import { useMutation, useQueryClient } from '@tanstack/react-query'
import { propertiesQueryKey } from '@/hooks/usePropertyList'
import { roomQueryKey } from '@/hooks/useRoom'
import { roomListQueryKey } from '@/hooks/useRoomList'
import { createRoom } from '@/services/roomService'
import type { RoomRequest } from '@/types/roomTypes'

export function useCreateRoom(propertyId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: RoomRequest) => createRoom(propertyId, request),
    onSuccess: async (room) => {
      queryClient.setQueryData(roomQueryKey(room.id), room)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: roomListQueryKey(room.propertyId) }),
        // Số phòng trên danh sách và chi tiết khu trọ đều thay đổi.
        queryClient.invalidateQueries({ queryKey: propertiesQueryKey }),
      ])
    },
  })
}
