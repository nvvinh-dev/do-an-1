import { api } from '@/lib/api'
import type { PagedResponse } from '@/types/paginationTypes'
import type { RoomSearchItem, RoomSearchParams } from '@/types/roomSearchTypes'
import { toRoomSearchQuery } from '@/utils/roomSearchParams'

// Tìm phòng công khai (docs/api-design.md mục 6); 60 lần mỗi phút theo IP, quá thì `429`.

/**
 * Gửi query đúng như trên URL của P1: `amenityIds` lặp lại (`amenityIds=1&amenityIds=2`) như backend
 * nhận, không theo dạng `amenityIds[]=1` mặc định của axios.
 */
export async function searchRooms(params: RoomSearchParams): Promise<PagedResponse<RoomSearchItem>> {
  const response = await api.get<PagedResponse<RoomSearchItem>>('/rooms/search', {
    params: toRoomSearchQuery(params),
  })
  return response.data
}
