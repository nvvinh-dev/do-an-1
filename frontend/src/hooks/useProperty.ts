import { useQuery } from '@tanstack/react-query'
import { propertiesQueryKey } from '@/hooks/usePropertyList'
import { getProperty } from '@/services/propertyService'

export function propertyQueryKey(id: number) {
  return [...propertiesQueryKey, 'detail', id] as const
}

/** Chi tiết một khu trọ của Chủ trọ đang đăng nhập; khu của người khác trả `404`. */
export function useProperty(id: number) {
  return useQuery({
    queryKey: propertyQueryKey(id),
    queryFn: () => getProperty(id),
  })
}
