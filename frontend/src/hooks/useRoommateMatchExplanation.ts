import { useQuery } from '@tanstack/react-query'
import { getRoommateMatchExplanation } from '@/services/roommateService'

/**
 * Đoạn giải thích điểm phù hợp (FR-120), chỉ tải khi người dùng bấm "Vì sao phù hợp?". Không thử lại khi
 * lỗi: `503` là AI lỗi hoặc hết hạn mức, gọi lại ngay cũng không khác.
 *
 * Khóa cố ý nằm ngoài `roommateQueryKey`: mỗi thao tác ở ghép làm mới cả khóa đó, nằm chung thì mọi đoạn
 * giải thích đang mở bị gọi AI lại, tốn hạn mức mà kết quả không đổi (hai hồ sơ không đổi).
 */
export function useRoommateMatchExplanation(profileId: number, enabled: boolean) {
  return useQuery({
    queryKey: ['roommate-explanations', profileId],
    queryFn: () => getRoommateMatchExplanation(profileId),
    enabled,
    retry: false,
    staleTime: Infinity,
  })
}
