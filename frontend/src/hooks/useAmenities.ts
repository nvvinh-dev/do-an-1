import { useQuery } from '@tanstack/react-query'
import { getAmenities } from '@/services/amenityService'

/** Danh mục tiện ích do hệ thống tạo sẵn, không có màn sửa, nên tải một lần mỗi lần mở trang. */
export function useAmenities() {
  return useQuery({
    queryKey: ['amenities'],
    queryFn: getAmenities,
    staleTime: Infinity,
  })
}
