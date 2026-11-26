import { useQuery } from '@tanstack/react-query'
import { contractsQueryKey } from '@/hooks/useContractList'
import { getNextInvoicePeriod } from '@/services/invoiceService'

/**
 * Kỳ và chỉ số cũ của hóa đơn định kỳ sắp lập (L7). Nằm dưới khóa hợp đồng để lập, sửa, hủy hóa đơn làm mới cả kỳ
 * này. `409` (chưa lập được) là câu trả lời, không phải lỗi mạng, nên không thử lại.
 */
export function useNextInvoicePeriod(contractId: number, enabled: boolean) {
  return useQuery({
    queryKey: [...contractsQueryKey, 'detail', contractId, 'invoices', 'next-period'],
    queryFn: () => getNextInvoicePeriod(contractId),
    enabled,
    retry: false,
  })
}
