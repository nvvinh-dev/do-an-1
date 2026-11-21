import { useQuery } from '@tanstack/react-query'
import { isNotFoundError } from '@/lib/apiError'
import { getMyRoommateProfile } from '@/services/roommateService'
import type { MyRoommateProfile } from '@/types/roommateTypes'

/**
 * Mọi dữ liệu ở ghép (hồ sơ, ứng viên, lời mời, kết nối, lượt chặn) nằm dưới khóa này: một thao tác
 * ở ghép đổi nhiều danh sách cùng lúc (chặn thì lời mời đang chờ chuyển Đã rút và ứng viên rời danh
 * sách), nên thao tác xong làm mới cả khóa.
 */
export const roommateQueryKey = ['roommate'] as const

/** `null` nghĩa là chưa có hồ sơ: `GET /roommate-profiles/me` trả `404` (docs/api-design.md mục 15). */
async function fetchMyRoommateProfile(): Promise<MyRoommateProfile | null> {
  try {
    return await getMyRoommateProfile()
  } catch (error) {
    if (isNotFoundError(error)) {
      return null
    }
    throw error
  }
}

/** Hồ sơ ở ghép của tài khoản đang đăng nhập (T7, T8). */
export function useMyRoommateProfile() {
  return useQuery({
    queryKey: [...roommateQueryKey, 'me'],
    queryFn: fetchMyRoommateProfile,
  })
}
