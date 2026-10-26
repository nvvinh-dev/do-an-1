import { useQuery } from '@tanstack/react-query'
import { getLocations } from '@/services/locationService'

/** Danh mục là file tĩnh trong backend, chỉ đổi khi triển khai lại, nên tải một lần mỗi lần mở trang. */
export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: getLocations,
    staleTime: Infinity,
  })
}
