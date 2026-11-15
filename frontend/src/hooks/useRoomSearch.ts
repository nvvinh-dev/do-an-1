import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { searchRooms } from '@/services/roomSearchService'
import type { RoomSearchParams } from '@/types/roomSearchTypes'

/**
 * Kết quả tìm phòng của P1. Đổi bộ lọc hay sang trang thì giữ kết quả cũ trên màn (`isPlaceholderData`)
 * tới khi có kết quả mới, không nháy về khung xương.
 */
export function useRoomSearch(params: RoomSearchParams) {
  return useQuery({
    queryKey: ['rooms', 'search', params],
    queryFn: () => searchRooms(params),
    placeholderData: keepPreviousData,
  })
}
