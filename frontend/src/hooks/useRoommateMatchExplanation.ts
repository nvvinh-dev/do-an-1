import { useQuery } from '@tanstack/react-query'
import { roommateQueryKey } from '@/hooks/useMyRoommateProfile'
import { getRoommateMatchExplanation } from '@/services/roommateService'

/**
 * Đoạn giải thích điểm phù hợp (FR-120), chỉ tải khi người dùng bấm "Vì sao phù hợp?". Không thử lại khi
 * lỗi: `503` là AI lỗi hoặc hết hạn mức, gọi lại ngay cũng không khác.
 */
export function useRoommateMatchExplanation(profileId: number, enabled: boolean) {
  return useQuery({
    queryKey: [...roommateQueryKey, 'explanations', profileId],
    queryFn: () => getRoommateMatchExplanation(profileId),
    enabled,
    retry: false,
    staleTime: Infinity,
  })
}
