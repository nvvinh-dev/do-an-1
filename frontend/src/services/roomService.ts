import { api } from '@/lib/api'
import type { RoomDetail, RoomListItem, RoomRequest } from '@/types/roomTypes'

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
