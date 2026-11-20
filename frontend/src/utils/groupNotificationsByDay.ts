import { getVietnamToday } from '@/utils/getVietnamToday'

export type NotificationDayGroupKey = 'today' | 'yesterday' | 'earlier'

export const NOTIFICATION_DAY_GROUP_LABELS: Record<NotificationDayGroupKey, string> = {
  today: 'Hôm nay',
  yesterday: 'Hôm qua',
  earlier: 'Trước đó',
}

export interface NotificationDayGroup<T> {
  key: NotificationDayGroupKey
  label: string
  items: T[]
}

/** Lùi một ngày lịch trên chuỗi `YYYY-MM-DD`; làm việc ở UTC để không lệch vì múi giờ máy. */
function previousDay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day - 1))
  return date.toISOString().slice(0, 10)
}

/**
 * Chia thông báo của một trang thành "Hôm nay", "Hôm qua", "Trước đó" theo ngày lịch giờ Việt Nam
 * (docs/frontend-screens.md mục 4, S2). Giữ nguyên thứ tự đầu vào (mới nhất trước) và bỏ nhóm rỗng.
 * Nhóm chỉ tính trong trang đang xem, không gọi thêm API.
 */
export function groupNotificationsByDay<T extends { createdAt: string }>(
  notifications: T[],
  now: Date = new Date(),
): NotificationDayGroup<T>[] {
  const today = getVietnamToday(now)
  const yesterday = previousDay(today)
  const buckets: Record<NotificationDayGroupKey, T[]> = { today: [], yesterday: [], earlier: [] }

  for (const notification of notifications) {
    const day = getVietnamToday(new Date(notification.createdAt))
    const key: NotificationDayGroupKey = day === today ? 'today' : day === yesterday ? 'yesterday' : 'earlier'
    buckets[key].push(notification)
  }

  return (['today', 'yesterday', 'earlier'] as const)
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({ key, label: NOTIFICATION_DAY_GROUP_LABELS[key], items: buckets[key] }))
}
