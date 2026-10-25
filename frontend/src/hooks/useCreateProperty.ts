import { useMutation, useQueryClient } from '@tanstack/react-query'
import { propertyQueryKey } from '@/hooks/useProperty'
import { propertiesQueryKey } from '@/hooks/usePropertyList'
import { createProperty } from '@/services/propertyService'

/** Response là chi tiết khu trọ vừa tạo nên ghi thẳng vào cache, trang chi tiết mở ra không phải gọi lại. */
export function useCreateProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProperty,
    onSuccess: (property) => {
      queryClient.setQueryData(propertyQueryKey(property.id), property)
      void queryClient.invalidateQueries({ queryKey: [...propertiesQueryKey, 'list'] })
    },
  })
}
