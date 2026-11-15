import { useQuery } from '@tanstack/react-query'
import { getRooms } from '@/services/roomService'

export const roomsQueryKey = ['rooms', 'landlord'] as const

export function roomListQueryKey(propertyId: number) {
  return [...roomsQueryKey, 'list', propertyId] as const
}

export function useRoomList(propertyId: number, includeArchived: boolean) {
  return useQuery({
    queryKey: [...roomListQueryKey(propertyId), { includeArchived }],
    queryFn: () => getRooms(propertyId, includeArchived),
  })
}
