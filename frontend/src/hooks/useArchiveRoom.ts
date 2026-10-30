import { useMutation, useQueryClient } from '@tanstack/react-query'
import { propertiesQueryKey } from '@/hooks/usePropertyList'
import { roomsQueryKey } from '@/hooks/useRoomList'
import { archiveRoom } from '@/services/roomService'

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
  })
}
