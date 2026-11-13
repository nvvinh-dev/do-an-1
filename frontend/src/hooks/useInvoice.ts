import { useQuery } from '@tanstack/react-query'
import { getInvoice } from '@/services/invoiceService'

export const invoicesQueryKey = ['invoices'] as const

export function invoiceQueryKey(id: number) {
  return [...invoicesQueryKey, 'detail', id] as const
}

/** Chi tiết một hóa đơn; `enabled` tắt khi chưa biết mã hóa đơn (hợp đồng chưa có bảng thanh lý). */
export function useInvoice(id: number | null) {
  return useQuery({
    queryKey: invoiceQueryKey(id ?? 0),
    queryFn: () => getInvoice(id ?? 0),
    enabled: id !== null,
  })
}
