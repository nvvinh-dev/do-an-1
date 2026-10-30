import { useMutation, useQueryClient } from '@tanstack/react-query'
import { contractsQueryKey } from '@/hooks/useContractList'
import { getApiErrorInfo } from '@/lib/apiError'
import { confirmContract } from '@/services/contractService'

/**
 * Người thuê đồng ý điều khoản. Thành công thì làm mới mọi dữ liệu hợp đồng vì trạng thái đổi ở cả
 * danh sách lẫn chi tiết. `409` nghĩa là hợp đồng đã đổi ở nơi khác (Chủ trọ vừa thu hồi, hoặc đã
 * quá hạn giữ chỗ): cũng tải lại để trang hiện đúng trạng thái mới.
 */
export function useConfirmContract(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => confirmContract(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contractsQueryKey }),
    onError: (error) => {
      if (getApiErrorInfo(error).status === 409) {
        void queryClient.invalidateQueries({ queryKey: contractsQueryKey })
      }
    },
  })
}
