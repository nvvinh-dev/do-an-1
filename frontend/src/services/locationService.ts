import { api } from '@/lib/api'
import type { Location } from '@/types/locationTypes'

// Công khai; danh mục đơn vị hành chính 2 cấp hiện hành (docs/api-design.md mục 6).
export async function getLocations(): Promise<Location[]> {
  const response = await api.get<Location[]>('/locations')
  return response.data
}
