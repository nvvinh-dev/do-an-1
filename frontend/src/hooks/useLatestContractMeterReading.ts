import { useQuery } from '@tanstack/react-query'
import { contractsQueryKey } from '@/hooks/useContractList'
import { getLatestContractMeterReading } from '@/services/invoiceService'

/** Chỉ số cũ của lần chốt kế tiếp, hiện ở form lập bảng thanh lý để Chủ trọ đối chiếu với đồng hồ. */
export function useLatestContractMeterReading(contractId: number, enabled: boolean) {
  return useQuery({
    queryKey: [...contractsQueryKey, 'detail', contractId, 'meter-readings', 'latest'],
    queryFn: () => getLatestContractMeterReading(contractId),
    enabled,
  })
}
