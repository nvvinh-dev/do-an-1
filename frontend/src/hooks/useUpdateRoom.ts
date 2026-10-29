import { useMutation, useQueryClient } from '@tanstack/react-query'
import { roomQueryKey } from '@/hooks/useRoom'
import { roomListQueryKey } from '@/hooks/useRoomList'
import { updateRoom } from '@/services/roomService'
import type { RoomRequest } from '@/types/roomTypes'

export function useUpdateRoom(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: RoomRequest) => updateRoom(id, request),
    onSuccess: (room) => {
      queryClient.setQueryData(roomQueryKey(room.id), room)
      return queryClient.invalidateQueries({ queryKey: roomListQueryKey(room.propertyId) })
    },
  })
}
