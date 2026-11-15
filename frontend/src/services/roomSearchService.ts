import { api } from '@/lib/api'
import type { PagedResponse } from '@/types/paginationTypes'
import type { PublicRoomDetail, RoomSearchItem, RoomSearchParams } from '@/types/roomSearchTypes'
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

/** Phòng ẩn, không còn cho thuê hay của Chủ trọ bị khóa trả `404` như phòng không tồn tại (BR-05). */
export async function getPublicRoom(id: number): Promise<PublicRoomDetail> {
  const response = await api.get<PublicRoomDetail>(`/rooms/${id}/public`)
  return response.data
}
