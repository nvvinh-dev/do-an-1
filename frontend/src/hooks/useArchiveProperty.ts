import { useMutation, useQueryClient } from '@tanstack/react-query'
import { propertiesQueryKey } from '@/hooks/usePropertyList'
import { roomsQueryKey } from '@/hooks/useRoomList'
import { archiveProperty } from '@/services/propertyService'

/**
 * Lưu trữ khu trọ: mọi phòng của khu chuyển `LuuTru` theo (docs/api-design.md mục 5.1), nên làm
 * mới toàn bộ dữ liệu khu trọ thay vì chỉ trang đang mở.
 */
export function useArchiveProperty(id: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => archiveProperty(id),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: propertiesQueryKey }),
        queryClient.invalidateQueries({ queryKey: roomsQueryKey }),
      ]),
  })
}
