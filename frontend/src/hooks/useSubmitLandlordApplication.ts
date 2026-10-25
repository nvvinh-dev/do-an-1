import { useMutation, useQueryClient } from '@tanstack/react-query'
import { myLandlordApplicationQueryKey } from '@/hooks/useMyLandlordApplication'
import { submitLandlordApplication } from '@/services/landlordApplicationService'

/**
 * Nộp hồ sơ Chủ trọ. Response là chính hồ sơ vừa tạo, cùng dạng với `GET /landlord-applications/me`,
 * nên ghi thẳng vào khóa đó để T2 chuyển sang trạng thái chờ duyệt mà không gọi lại API.
 */
export function useSubmitLandlordApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: submitLandlordApplication,
    onSuccess: (application) => queryClient.setQueryData(myLandlordApplicationQueryKey, application),
  })
}
