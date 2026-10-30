import { useQuery } from '@tanstack/react-query'
import { contractsQueryKey } from '@/hooks/useContractList'
import { getContract } from '@/services/contractService'

export function contractQueryKey(id: number) {
  return [...contractsQueryKey, 'detail', id] as const
}

/** Chi tiết một hợp đồng; hợp đồng không thuộc người gọi trả `404`. */
export function useContract(id: number) {
  return useQuery({
    queryKey: contractQueryKey(id),
    queryFn: () => getContract(id),
  })
}
