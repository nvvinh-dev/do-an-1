import { useQuery } from '@tanstack/react-query'
import { roomsQueryKey } from '@/hooks/useRoomList'
import { getLatestRoomMeterReading } from '@/services/roomService'

/** Chỉ số cuối của phòng để điền sẵn chỉ số đầu ở form lập hợp đồng; `null` khi phòng chưa từng có hợp đồng. */
export function useLatestRoomMeterReading(roomId: number, enabled: boolean) {
  return useQuery({
    queryKey: [...roomsQueryKey, 'detail', roomId, 'meter-readings', 'latest'],
    queryFn: () => getLatestRoomMeterReading(roomId),
    enabled,
  })
}
