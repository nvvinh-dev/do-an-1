import { useQuery } from '@tanstack/react-query'
import { rentalRequestsQueryKey } from '@/hooks/useRentalRequestList'
import { getRentalRequest } from '@/services/rentalRequestService'

export function rentalRequestQueryKey(id: number) {
  return [...rentalRequestsQueryKey, 'detail', id] as const
}

/** Chi tiết một yêu cầu thuê; yêu cầu không thuộc người gọi trả `404`. */
export function useRentalRequest(id: number) {
  return useQuery({
    queryKey: rentalRequestQueryKey(id),
    queryFn: () => getRentalRequest(id),
  })
}
