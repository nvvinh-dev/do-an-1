import { useQuery } from '@tanstack/react-query'
import { getContracts } from '@/services/contractService'
import type { ContractListParams } from '@/types/contractTypes'

/**
 * Mọi dữ liệu hợp đồng (danh sách, chi tiết) nằm dưới khóa này: đồng ý, yêu cầu sửa, hủy làm mới
 * cả khóa vì trạng thái và hạn giữ chỗ hiện ở cả danh sách lẫn chi tiết.
 */
export const contractsQueryKey = ['contracts'] as const

/** Danh sách hợp đồng theo vai trò của người gọi, mới lập trước. */
export function useContractList(params: ContractListParams) {
  return useQuery({
    queryKey: [...contractsQueryKey, 'list', params],
    queryFn: () => getContracts(params),
  })
}
