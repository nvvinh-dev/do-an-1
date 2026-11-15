import { useMutation, useQueryClient } from '@tanstack/react-query'
import { propertyQueryKey } from '@/hooks/useProperty'
import { propertiesQueryKey } from '@/hooks/usePropertyList'
import { updateProperty } from '@/services/propertyService'
import type { PropertyRequest } from '@/types/propertyTypes'

/** Response là chi tiết khu trọ sau khi sửa nên ghi thẳng vào cache. */
export function useUpdateProperty(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: PropertyRequest) => updateProperty(id, request),
    onSuccess: (property) => {
      queryClient.setQueryData(propertyQueryKey(property.id), property)
      void queryClient.invalidateQueries({ queryKey: [...propertiesQueryKey, 'list'] })
    },
  })
}
