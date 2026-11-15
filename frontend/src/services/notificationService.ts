import { api } from '@/lib/api'
import type { PagedResponse } from '@/types/paginationTypes'
import type {
  NotificationListItem,
  NotificationListParams,
  UnreadNotificationCount,
} from '@/types/notificationTypes'

// Thông báo (docs/api-design.md mục 11). Người gọi chỉ thấy thông báo của chính mình; thông báo
// của người khác trả `404`.

export async function getNotifications(params: NotificationListParams): Promise<PagedResponse<NotificationListItem>> {
  const response = await api.get<PagedResponse<NotificationListItem>>('/notifications', { params })
  return response.data
}

export async function getUnreadNotificationCount(): Promise<UnreadNotificationCount> {
  const response = await api.get<UnreadNotificationCount>('/notifications/unread-count')
  return response.data
}

// Gọi lại trên thông báo đã đọc vẫn trả `204`.
export async function markNotificationAsRead(id: number): Promise<void> {
  await api.post(`/notifications/${id}/read`)
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await api.post('/notifications/read-all')
}
