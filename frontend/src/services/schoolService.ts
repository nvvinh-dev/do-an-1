import { api } from '@/lib/api'
import type { School } from '@/types/schoolTypes'

// Công khai; danh mục trường đại học, học viện và cao đẳng cho ô chọn trường ở T7 (docs/api-design.md mục 15).
export async function getSchools(): Promise<School[]> {
  const response = await api.get<School[]>('/schools')
  return response.data
}
