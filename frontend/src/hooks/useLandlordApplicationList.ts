import { useQuery } from '@tanstack/react-query'
import { getLandlordApplications } from '@/services/landlordApplicationService'
import type { LandlordApplicationListParams } from '@/types/landlordApplicationTypes'

/**
 * Mọi dữ liệu hồ sơ Chủ trọ phía Admin (danh sách, chi tiết) nằm dưới khóa này: duyệt, từ chối làm
 * mới cả khóa vì trạng thái hiện ở cả danh sách lẫn chi tiết. Tách khỏi khóa hồ sơ của chính người
 * dùng (`useMyLandlordApplication`).
 */
export const adminLandlordApplicationsQueryKey = ['admin', 'landlord-applications'] as const

/** Danh sách hồ sơ Chủ trọ cho Admin (AD2), mới nộp trước. */
export function useLandlordApplicationList(params: LandlordApplicationListParams) {
  return useQuery({
    queryKey: [...adminLandlordApplicationsQueryKey, 'list', params],
    queryFn: () => getLandlordApplications(params),
  })
}
