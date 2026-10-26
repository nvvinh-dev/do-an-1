import { api } from '@/lib/api'
import type { PropertyDetail, PropertyListItem, PropertyRequest } from '@/types/propertyTypes'

// Khu trọ của Chủ trọ đang đăng nhập (docs/api-design.md mục 5.1).

export async function getProperties(includeArchived: boolean): Promise<PropertyListItem[]> {
  const response = await api.get<PropertyListItem[]>('/properties', {
    params: includeArchived ? { includeArchived: true } : undefined,
  })
  return response.data
}

export async function getProperty(id: number): Promise<PropertyDetail> {
  const response = await api.get<PropertyDetail>(`/properties/${id}`)
  return response.data
}

export async function createProperty(request: PropertyRequest): Promise<PropertyDetail> {
  const response = await api.post<PropertyDetail>('/properties', request)
  return response.data
}

export async function updateProperty(id: number, request: PropertyRequest): Promise<PropertyDetail> {
  const response = await api.put<PropertyDetail>(`/properties/${id}`, request)
  return response.data
}

// `409` khi còn phòng đang giữ chỗ hoặc đang thuê (BR-10). Lưu trữ là vĩnh viễn.
export async function archiveProperty(id: number): Promise<void> {
  await api.post(`/properties/${id}/archive`)
}
