import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { contractsQueryKey } from '@/hooks/useContractList'
import { invoicesQueryKey } from '@/hooks/useInvoice'
import { landlordDashboardQueryKey } from '@/hooks/useLandlordDashboard'
import { tenantDashboardQueryKey } from '@/hooks/useTenantDashboard'
import { getApiErrorInfo } from '@/lib/apiError'

/**
 * Thao tác trên hóa đơn (L7, L8, T5) đổi hóa đơn đó, danh sách hóa đơn của hợp đồng (nằm dưới khóa hợp đồng,
 * cũng chặn nút sửa chỉ số đầu ở L6) và số tiền trên dashboard hai vai trò. Làm mới cả nhóm này.
 */
function invalidateInvoiceQueries(queryClient: QueryClient) {
  return Promise.all(
    [invoicesQueryKey, contractsQueryKey, landlordDashboardQueryKey, tenantDashboardQueryKey].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  )
}

/**
 * Như `useLeaseMutation`: thành công thì làm mới dữ liệu liên quan; `409` là trạng thái đã đổi ở nơi khác
 * (người thuê vừa báo thanh toán, Chủ trọ vừa xác nhận, hóa đơn mới hơn vừa lập) nên cũng tải lại để nút hiện
 * theo trạng thái mới (docs/frontend-screens.md mục 1). `onSuccess` chạy trước khi làm mới, để form chuyển
 * trang ngay.
 */
export function useInvoiceMutation<TVariables = void, TData = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: { onSuccess?: (data: TData) => void },
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      options?.onSuccess?.(data)
      return invalidateInvoiceQueries(queryClient)
    },
    onError: (error) => {
      if (getApiErrorInfo(error).status === 409) {
        void invalidateInvoiceQueries(queryClient)
      }
    },
  })
}
