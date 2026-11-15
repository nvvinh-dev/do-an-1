import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsQueryKey } from '@/hooks/useNotificationList'
import { markNotificationAsRead } from '@/services/notificationService'

/**
 * Đánh dấu một thông báo đã đọc khi người dùng bấm vào. Trang thường chuyển đi ngay sau khi gọi,
 * nên làm mới dữ liệu ở `onSuccess` của hook (vẫn chạy khi trang đã đóng) để chuông cập nhật.
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => markNotificationAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
  })
}
