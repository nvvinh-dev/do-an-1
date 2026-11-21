import { useQuery } from '@tanstack/react-query'
import { roommateQueryKey } from '@/hooks/useMyRoommateProfile'
import { getRoommateBlocks } from '@/services/roommateService'

/** Các lượt mình đã chặn, mới nhất trước (T7). */
export function useRoommateBlocks() {
  return useQuery({
    queryKey: [...roommateQueryKey, 'blocks'],
    queryFn: getRoommateBlocks,
  })
}
