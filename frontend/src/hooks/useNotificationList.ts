import { useQuery } from '@tanstack/react-query'
import { getNotifications } from '@/services/notificationService'
import type { NotificationListParams } from '@/types/notificationTypes'

/**
 * Mọi dữ liệu thông báo (danh sách, số chưa đọc trên chuông) nằm dưới khóa này: đánh dấu đã đọc
 * làm mới cả khóa để danh sách và chuông cùng cập nhật.
 */
export const notificationsQueryKey = ['notifications'] as const

/** Thông báo của người đang đăng nhập, mới nhất trước. */
export function useNotificationList(params: NotificationListParams) {
  return useQuery({
    queryKey: [...notificationsQueryKey, 'list', params],
    queryFn: () => getNotifications(params),
  })
}
