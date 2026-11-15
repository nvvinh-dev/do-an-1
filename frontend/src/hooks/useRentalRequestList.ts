import { useQuery } from '@tanstack/react-query'
import { getRentalRequests } from '@/services/rentalRequestService'
import type { RentalRequestListParams } from '@/types/rentalRequestTypes'

/**
 * Mọi dữ liệu yêu cầu thuê (danh sách, chi tiết) nằm dưới khóa này: gửi, rút, duyệt, từ chối làm
 * mới cả khóa vì trạng thái và hạn đếm ngược hiện ở cả danh sách lẫn chi tiết.
 */
export const rentalRequestsQueryKey = ['rental-requests'] as const

/** Danh sách yêu cầu thuê theo vai trò của người gọi, mới gửi trước. */
export function useRentalRequestList(params: RentalRequestListParams) {
  return useQuery({
    queryKey: [...rentalRequestsQueryKey, 'list', params],
    queryFn: () => getRentalRequests(params),
  })
}
