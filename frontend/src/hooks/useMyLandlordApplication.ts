import { useQuery } from '@tanstack/react-query'
import { isNotFoundError } from '@/lib/apiError'
import { getMyLandlordApplication } from '@/services/landlordApplicationService'
import type { LandlordApplication } from '@/types/landlordApplicationTypes'

export const myLandlordApplicationQueryKey = ['landlord-applications', 'me'] as const

/** `null` nghĩa là chưa nộp hồ sơ nào: `GET /landlord-applications/me` trả `404` (docs/api-design.md mục 3). */
async function fetchMyLandlordApplication(): Promise<LandlordApplication | null> {
  try {
    return await getMyLandlordApplication()
  } catch (error) {
    if (isNotFoundError(error)) {
      return null
    }
    throw error
  }
}

/** Hồ sơ đăng ký Chủ trọ mới nhất của tài khoản đang đăng nhập (T2). */
export function useMyLandlordApplication() {
  return useQuery({
    queryKey: myLandlordApplicationQueryKey,
    queryFn: fetchMyLandlordApplication,
  })
}
