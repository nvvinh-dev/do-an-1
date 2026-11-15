import { useMutation, useQueryClient } from '@tanstack/react-query'
import { myLandlordApplicationQueryKey } from '@/hooks/useMyLandlordApplication'
import { getApiErrorInfo } from '@/lib/apiError'
import { submitLandlordApplication } from '@/services/landlordApplicationService'

/**
 * Nộp hồ sơ Chủ trọ. Response là chính hồ sơ vừa tạo, cùng dạng với `GET /landlord-applications/me`,
 * nên ghi thẳng vào khóa đó để T2 chuyển sang trạng thái chờ duyệt mà không gọi lại API.
 *
 * `409` có thể do hồ sơ đã nộp hoặc đã được duyệt ở tab hay máy khác: tải lại hồ sơ để T2 chuyển
 * sang đúng trạng thái. `409` vì còn hợp đồng hay yêu cầu thuê đang mở thì hồ sơ không đổi, form và
 * `detail` vẫn giữ nguyên.
 */
export function useSubmitLandlordApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: submitLandlordApplication,
    onSuccess: (application) => queryClient.setQueryData(myLandlordApplicationQueryKey, application),
    onError: (error) => {
      if (getApiErrorInfo(error).status === 409) {
        void queryClient.invalidateQueries({ queryKey: myLandlordApplicationQueryKey })
      }
    },
  })
}
