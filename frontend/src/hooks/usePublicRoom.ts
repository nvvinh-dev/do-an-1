import { useQuery } from '@tanstack/react-query'
import { getPublicRoom } from '@/services/roomSearchService'

/** Chi tiết phòng công khai của P2. */
export function usePublicRoom(id: number) {
  return useQuery({
    queryKey: ['rooms', 'public', id],
    queryFn: () => getPublicRoom(id),
  })
}
