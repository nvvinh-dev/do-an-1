import { useQuery } from '@tanstack/react-query'
import { roomsQueryKey } from '@/hooks/useRoomList'
import { getRoom } from '@/services/roomService'

export function roomQueryKey(id: number) {
  return [...roomsQueryKey, 'detail', id] as const
}

export function useRoom(id: number) {
  return useQuery({ queryKey: roomQueryKey(id), queryFn: () => getRoom(id) })
}
