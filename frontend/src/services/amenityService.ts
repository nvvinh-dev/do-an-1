import { api } from '@/lib/api'
import type { Amenity } from '@/types/amenityTypes'

// Công khai; gồm tiện ích của cả khu trọ và phòng, phân biệt bằng `scope` (docs/api-design.md mục 6).
export async function getAmenities(): Promise<Amenity[]> {
  const response = await api.get<Amenity[]>('/amenities')
  return response.data
}
