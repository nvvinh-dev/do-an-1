import { useQuery } from '@tanstack/react-query'
import { roommateQueryKey } from '@/hooks/useMyRoommateProfile'
import { getRoommateMatches } from '@/services/roommateService'

/** Ứng viên ở ghép (T8). Chỉ gọi khi đã có hồ sơ, vì chưa có hồ sơ thì server trả `409`. */
export function useRoommateMatches(enabled: boolean) {
  return useQuery({
    queryKey: [...roommateQueryKey, 'matches'],
    queryFn: getRoommateMatches,
    enabled,
  })
}
