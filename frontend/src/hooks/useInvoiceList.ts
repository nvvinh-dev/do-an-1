import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { invoicesQueryKey } from '@/hooks/useInvoice'
import { getInvoices } from '@/services/invoiceService'
import type { InvoiceListParams } from '@/types/invoiceTypes'

/** Hóa đơn của mọi hợp đồng theo vai trò người gọi (L8, T5), kỳ mới trước. */
export function useInvoiceList(params: InvoiceListParams) {
  return useQuery({
    queryKey: [...invoicesQueryKey, 'list', params],
    queryFn: () => getInvoices(params),
    // Đổi bộ lọc, sang trang thì giữ danh sách cũ trong lúc tải, không nháy về khung xương.
    placeholderData: keepPreviousData,
  })
}
