import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invoicesQueryKey } from '@/hooks/useInvoice'
import { invalidateLeaseQueries } from '@/hooks/useLeaseMutation'
import { getApiErrorInfo } from '@/lib/apiError'

/**
 * Thao tác trên bảng thanh lý (L9). Mỗi thao tác đổi hóa đơn thanh lý, có thể đổi cả hợp đồng (có bảng, đã
 * thanh lý), phòng (về Trống, Bảo trì) và các hóa đơn còn nợ (chuyển vào thanh lý), nên làm mới cả nhóm dữ
 * liệu hợp đồng và hóa đơn. `409` là trạng thái đã đổi ở nơi khác (người thuê vừa đồng ý, yêu cầu sửa):
 * cũng tải lại để nút hiện theo trạng thái mới (docs/frontend-screens.md mục 1).
 */
export function useSettlementMutation<TVariables = void, TData = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: { onSuccess?: (data: TData) => void },
) {
  const queryClient = useQueryClient()
  const invalidate = () =>
    Promise.all([invalidateLeaseQueries(queryClient), queryClient.invalidateQueries({ queryKey: invoicesQueryKey })])

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      options?.onSuccess?.(data)
      return invalidate()
    },
    onError: (error) => {
      if (getApiErrorInfo(error).status === 409) {
        void invalidate()
      }
    },
  })
}
