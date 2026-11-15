import { useQuery } from '@tanstack/react-query'
import { contractsQueryKey } from '@/hooks/useContractList'
import { getContractInvoices } from '@/services/contractService'

/**
 * Hóa đơn của một hợp đồng, kỳ mới trước. Nằm dưới khóa hợp đồng để thao tác trên hợp đồng (sửa chỉ
 * số đầu, hủy) làm mới cả danh sách này. `enabled` tắt khi hợp đồng chưa thể có hóa đơn.
 */
export function useContractInvoices(contractId: number, enabled: boolean) {
  return useQuery({
    queryKey: [...contractsQueryKey, 'detail', contractId, 'invoices'],
    queryFn: () => getContractInvoices(contractId),
    enabled,
  })
}
