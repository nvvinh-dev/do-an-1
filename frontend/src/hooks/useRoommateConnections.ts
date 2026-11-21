import { useQuery } from '@tanstack/react-query'
import { roommateQueryKey } from '@/hooks/useMyRoommateProfile'
import { getRoommateConnections } from '@/services/roommateService'

/** Các kết nối đã chấp nhận, kèm họ tên và số điện thoại bên kia (T9). */
export function useRoommateConnections(enabled: boolean) {
  return useQuery({
    queryKey: [...roommateQueryKey, 'connections'],
    queryFn: getRoommateConnections,
    enabled,
  })
}
