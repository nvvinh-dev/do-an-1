import { useMutation, useQueryClient } from '@tanstack/react-query'
import { contractsQueryKey } from '@/hooks/useContractList'
import { getApiErrorInfo } from '@/lib/apiError'
import { requestContractChanges } from '@/services/contractService'

/**
 * Người thuê yêu cầu Chủ trọ sửa hợp đồng, kèm lý do; hợp đồng về `Nhap`. Làm mới dữ liệu hợp đồng
 * khi thành công và khi gặp `409` (hợp đồng đã đổi ở nơi khác), như `useConfirmContract`.
 */
export function useRequestContractChanges(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (reason: string) => requestContractChanges(id, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contractsQueryKey }),
    onError: (error) => {
      if (getApiErrorInfo(error).status === 409) {
        void queryClient.invalidateQueries({ queryKey: contractsQueryKey })
      }
    },
  })
}
