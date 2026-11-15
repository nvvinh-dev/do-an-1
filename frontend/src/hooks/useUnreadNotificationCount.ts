import { useQuery } from '@tanstack/react-query'
import { getUnreadNotificationCount } from '@/services/notificationService'

/** Nằm dưới khóa `['notifications']`: màn Thông báo làm mới khóa đó là chuông cập nhật theo. */
export const unreadNotificationCountQueryKey = ['notifications', 'unread-count'] as const

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: unreadNotificationCountQueryKey,
    queryFn: getUnreadNotificationCount,
  })
}
