import { api } from '@/lib/api'
import type { UnreadNotificationCount } from '@/types/notificationTypes'

export async function getUnreadNotificationCount(): Promise<UnreadNotificationCount> {
  const response = await api.get<UnreadNotificationCount>('/notifications/unread-count')
  return response.data
}
