import { useQuery } from '@tanstack/react-query'
import { roommateQueryKey } from '@/hooks/useMyRoommateProfile'
import { isNotFoundError } from '@/lib/apiError'
import { getRoommateProfile } from '@/services/roommateService'
import type { RoommatePublicProfile } from '@/types/roommateTypes'

/**
 * `null` nghĩa là không còn xem được hồ sơ: server trả `404` khi một bên đã chặn hoặc hai bên không còn
 * lời mời nào (FR-114, FR-118). Đây là trạng thái bình thường của T9, không phải lỗi hệ thống.
 */
async function fetchRoommateProfile(id: number): Promise<RoommatePublicProfile | null> {
  try {
    return await getRoommateProfile(id)
  } catch (error) {
    if (isNotFoundError(error)) {
      return null
    }
    throw error
  }
}

/** Phần không định danh của hồ sơ bên kia, chỉ tải khi người dùng mở xem. */
export function useRoommateProfile(id: number, enabled: boolean) {
  return useQuery({
    queryKey: [...roommateQueryKey, 'profiles', id],
    queryFn: () => fetchRoommateProfile(id),
    enabled,
  })
}
