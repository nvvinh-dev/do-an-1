import { useQuery } from '@tanstack/react-query'
import { getSchools } from '@/services/schoolService'

/** Danh mục là file tĩnh trong backend, chỉ đổi khi triển khai lại, nên tải một lần mỗi lần mở trang. */
export function useSchools() {
  return useQuery({
    queryKey: ['schools'],
    queryFn: getSchools,
    staleTime: Infinity,
  })
}
