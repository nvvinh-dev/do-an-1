import { api } from '@/lib/api'
import type {
  LandlordRoomOccupancyStatus,
  LandlordRoomVisibilityStatus,
  RoomDetail,
  RoomListItem,
  RoomRequest,
} from '@/types/roomTypes'

export async function getRooms(propertyId: number, includeArchived: boolean): Promise<RoomListItem[]> {
  const response = await api.get<RoomListItem[]>(`/properties/${propertyId}/rooms`, {
    params: includeArchived ? { includeArchived: true } : undefined,
  })
  return response.data
}

export async function getRoom(id: number): Promise<RoomDetail> {
  const response = await api.get<RoomDetail>(`/rooms/${id}`)
  return response.data
}

export async function createRoom(propertyId: number, request: RoomRequest): Promise<RoomDetail> {
  const response = await api.post<RoomDetail>(`/properties/${propertyId}/rooms`, request)
  return response.data
}

export async function updateRoom(id: number, request: RoomRequest): Promise<RoomDetail> {
  const response = await api.put<RoomDetail>(`/rooms/${id}`, request)
  return response.data
}

// `409` khi phòng đã lưu trữ hoặc tin bị Admin ẩn; bật hiển thị khi phòng chưa có ảnh nào trả `422`.
export async function changeRoomVisibility(id: number, visibilityStatus: LandlordRoomVisibilityStatus): Promise<void> {
  await api.patch(`/rooms/${id}/visibility`, { visibilityStatus })
}

// Chỉ Trống ↔ Bảo trì; chuyển tiếp khác, hoặc về Trống khi hợp đồng hiện tại chưa kết thúc (BR-08), trả `409`.
export async function changeRoomOccupancyStatus(
  id: number,
  occupancyStatus: LandlordRoomOccupancyStatus,
): Promise<void> {
  await api.patch(`/rooms/${id}/occupancy-status`, { occupancyStatus })
}

// Chỉ phòng Trống hoặc Bảo trì, trạng thái khác trả `409`. Lưu trữ là vĩnh viễn.
export async function archiveRoom(id: number): Promise<void> {
  await api.post(`/rooms/${id}/archive`)
}
