import { useQuery } from '@tanstack/react-query'
import { adminLandlordApplicationsQueryKey } from '@/hooks/useLandlordApplicationList'
import { getLandlordApplication } from '@/services/landlordApplicationService'

export function landlordApplicationQueryKey(id: number) {
  return [...adminLandlordApplicationsQueryKey, 'detail', id] as const
}

/**
 * Chi tiết một hồ sơ kèm số CCCD và URL xem giấy tờ, chỉ Admin gọi được (AD2). URL có hạn 15 phút
 * nên không giữ lại sau khi rời trang (`gcTime: 0`, docs/frontend-screens.md mục 1): mở lại trang
 * là lấy URL mới.
 */
export function useLandlordApplication(id: number) {
  return useQuery({
    queryKey: landlordApplicationQueryKey(id),
    queryFn: () => getLandlordApplication(id),
    gcTime: 0,
  })
}
