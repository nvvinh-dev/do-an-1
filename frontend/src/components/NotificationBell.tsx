import { Bell } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount'

/** Chuông ở thanh trên của Người thuê và Chủ trọ; Admin không có (docs/frontend-screens.md mục 1). */
export default function NotificationBell() {
  const { data } = useUnreadNotificationCount()
  const count = data?.count ?? 0

  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link to="/notifications" aria-label={count > 0 ? `Thông báo, ${count} chưa đọc` : 'Thông báo'}>
        <Bell className="size-5" />
        {count > 0 && (
          <Badge className="absolute top-0.5 left-1/2 min-w-5 px-1 tabular-nums">
            {count > 99 ? '99+' : count}
          </Badge>
        )}
      </Link>
    </Button>
  )
}
