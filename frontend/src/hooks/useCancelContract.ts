import { useMutation, useQueryClient } from '@tanstack/react-query'
import { contractsQueryKey } from '@/hooks/useContractList'
import { getApiErrorInfo } from '@/lib/apiError'
import { cancelContract } from '@/services/contractService'

/**
 * Hủy hợp đồng trước ngày bắt đầu, kèm lý do. Làm mới dữ liệu hợp đồng khi thành công và khi gặp
 * `409` (bên kia vừa hủy, hoặc đã tới ngày bắt đầu), như `useConfirmContract`.
 */
export function useCancelContract(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (reason: string) => cancelContract(id, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contractsQueryKey }),
    onError: (error) => {
      if (getApiErrorInfo(error).status === 409) {
        void queryClient.invalidateQueries({ queryKey: contractsQueryKey })
      }
    },
  })
}
