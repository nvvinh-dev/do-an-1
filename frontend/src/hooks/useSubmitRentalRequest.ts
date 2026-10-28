import { useMutation, useQueryClient } from '@tanstack/react-query'
import { rentalRequestQueryKey } from '@/hooks/useRentalRequest'
import { rentalRequestsQueryKey } from '@/hooks/useRentalRequestList'
import { submitRentalRequest } from '@/services/rentalRequestService'
import type { SubmitRentalRequestRequest } from '@/types/rentalRequestTypes'

/** Response là chi tiết yêu cầu vừa gửi nên ghi thẳng vào cache, trang chi tiết mở ra không phải gọi lại. */
export function useSubmitRentalRequest(roomId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: SubmitRentalRequestRequest) => submitRentalRequest(roomId, request),
    onSuccess: (rentalRequest) => {
      queryClient.setQueryData(rentalRequestQueryKey(rentalRequest.id), rentalRequest)
      void queryClient.invalidateQueries({ queryKey: [...rentalRequestsQueryKey, 'list'] })
    },
  })
}
