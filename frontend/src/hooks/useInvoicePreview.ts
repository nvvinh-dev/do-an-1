import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { contractsQueryKey } from '@/hooks/useContractList'
import { previewInvoice } from '@/services/invoiceService'
import type { PeriodicInvoiceRequest } from '@/types/invoiceTypes'

/** Chờ người dùng ngừng gõ chừng này mới gọi xem trước (docs/frontend-screens.md L7). */
const PREVIEW_DELAY_MS = 500

/**
 * Tổng tạm tính do server tính ở L7 (`POST /contracts/{id}/invoices/preview`). `request` là `null` khi form chưa đủ
 * để tính thì không gọi. Gõ liên tục chỉ gọi một lần sau khi ngừng; trong lúc chờ kết quả mới vẫn giữ kết quả cũ để
 * khối tạm tính không nhấp nháy. `409`, `422` là câu trả lời của server nên không thử lại.
 */
export function useInvoicePreview(contractId: number, request: PeriodicInvoiceRequest | null) {
  const requestKey = request === null ? null : JSON.stringify(request)
  const [debouncedKey, setDebouncedKey] = useState(requestKey)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKey(requestKey), PREVIEW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [requestKey])

  const query = useQuery({
    queryKey: [...contractsQueryKey, 'detail', contractId, 'invoices', 'preview', debouncedKey],
    queryFn: () => previewInvoice(contractId, JSON.parse(debouncedKey!) as PeriodicInvoiceRequest),
    enabled: debouncedKey !== null,
    placeholderData: keepPreviousData,
    retry: false,
  })

  return {
    ...query,
    /** Form chưa đủ để tính, hoặc vừa đổi và đang chờ hết thời gian trễ. */
    isWaiting: requestKey !== debouncedKey,
    hasRequest: requestKey !== null,
  }
}
