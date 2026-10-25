import { useQuery } from '@tanstack/react-query'
import { getProperties } from '@/services/propertyService'

/**
 * Mọi dữ liệu khu trọ (danh sách, chi tiết) nằm dưới khóa này: tạo, sửa, lưu trữ khu trọ làm mới
 * cả khóa vì số phòng và trạng thái hiện ở nhiều chỗ.
 */
export const propertiesQueryKey = ['properties'] as const

export function usePropertyList(includeArchived: boolean) {
  return useQuery({
    queryKey: [...propertiesQueryKey, 'list', { includeArchived }],
    queryFn: () => getProperties(includeArchived),
  })
}
