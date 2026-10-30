import { useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsQueryKey } from '@/hooks/useNotificationList'
import { markAllNotificationsAsRead } from '@/services/notificationService'

/** Đánh dấu mọi thông báo của mình đã đọc, rồi làm mới danh sách và số trên chuông. */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey }),
  })
}
