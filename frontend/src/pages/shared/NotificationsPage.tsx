import { Bell, CheckCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useMarkAllNotificationsAsRead } from '@/hooks/useMarkAllNotificationsAsRead'
import { useMarkNotificationAsRead } from '@/hooks/useMarkNotificationAsRead'
import { useNotificationList } from '@/hooks/useNotificationList'
import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/authTypes'
import type { NotificationListItem } from '@/types/notificationTypes'
import { formatDate } from '@/utils/formatDate'
import { getNotificationTargetPath } from '@/utils/getNotificationTargetPath'

const READ_FILTERS = ['all', 'unread', 'read'] as const
type ReadFilter = (typeof READ_FILTERS)[number]

/**
 * S2 — Thông báo (docs/frontend-screens.md mục 4): mới nhất trước, lọc đã đọc / chưa đọc, phân
 * trang. Bộ lọc và trang nằm trên query của URL (`?isRead=false&page=2`) để quay lại từ trang vừa
 * mở vẫn giữ chỗ đang xem. Bấm một thông báo thì đánh dấu đã đọc và mở trang của bản ghi theo vai
 * trò hiện tại; chuông trên thanh trên cập nhật theo vì cùng khóa dữ liệu `['notifications']`.
 */
export default function NotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = parseIsReadParam(searchParams.get('isRead'))
  const page = parsePage(searchParams.get('page'))
  const listQuery = useNotificationList({ isRead: toIsRead(filter), page })
  const { data: unreadCount } = useUnreadNotificationCount()
  const { data: user } = useCurrentUser()
  const markAsReadMutation = useMarkNotificationAsRead()
  const markAllAsReadMutation = useMarkAllNotificationsAsRead()

  // Đổi bộ lọc thì về trang 1, vì số trang của bộ lọc mới khác.
  const setFilter = (nextFilter: ReadFilter) => {
    const isRead = toIsRead(nextFilter)
    setSearchParams(isRead === undefined ? {} : { isRead: String(isRead) }, { replace: true })
  }

  const markAllAsRead = () => {
    markAllAsReadMutation.mutate(undefined, {
      onSuccess: () => toast.success('Đã đánh dấu tất cả là đã đọc'),
    })
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Thông báo"
        description="Thay đổi về yêu cầu thuê, hợp đồng và hóa đơn của bạn, mới nhất xếp trước."
        action={
          <Button
            type="button"
            size="page"
            variant="outline"
            onClick={markAllAsRead}
            disabled={markAllAsReadMutation.isPending || unreadCount?.count === 0}
          >
            {markAllAsReadMutation.isPending ? <Spinner /> : <CheckCheck />}
            Đánh dấu tất cả đã đọc
          </Button>
        }
      />

      <ApiErrorAlert error={markAllAsReadMutation.error} />

      <Tabs value={filter} onValueChange={(value) => setFilter(parseTabValue(value))} className="gap-6">
        <TabsList className="w-full md:w-fit">
          <TabsTrigger value="all" className="md:px-4">
            Tất cả
          </TabsTrigger>
          <TabsTrigger value="unread" className="md:px-4">
            Chưa đọc
          </TabsTrigger>
          <TabsTrigger value="read" className="md:px-4">
            Đã đọc
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="flex flex-col gap-6">
          {listQuery.isPending ? (
            <NotificationListSkeleton />
          ) : listQuery.isLoadingError ? (
            <ApiErrorAlert error={listQuery.error} onRetry={() => void listQuery.refetch()} />
          ) : (
            <>
              {/* Lần tải lại lỗi (quay lại tab, sau khi đánh dấu đã đọc) thì giữ danh sách cũ, chỉ báo lỗi kèm nút thử lại. */}
              {listQuery.isRefetchError && (
                <ApiErrorAlert error={listQuery.error} onRetry={() => void listQuery.refetch()} />
              )}
              {/* Chỉ thấy khi thông báo vừa bấm không dẫn tới trang nào, vì có trang thì đã chuyển đi. */}
              <ApiErrorAlert error={markAsReadMutation.error} />
              {listQuery.data.items.length === 0 ? (
                <NotificationListEmpty
                  filter={filter}
                  isPastLastPage={page > 1 && listQuery.data.totalItems > 0}
                  searchParams={searchParams}
                  onShowAll={() => setFilter('all')}
                />
              ) : (
                <>
                  <NotificationList
                    notifications={listQuery.data.items}
                    role={user?.roles[0]}
                    onOpen={(notification) => {
                      if (!notification.isRead) {
                        markAsReadMutation.mutate(notification.id)
                      }
                    }}
                  />
                  <NotificationPagination
                    page={listQuery.data.page}
                    totalPages={listQuery.data.totalPages}
                    searchParams={searchParams}
                  />
                </>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </section>
  )
}

// Giá trị lạ trên URL (gõ tay, đường dẫn cũ) thì coi như không lọc, không gửi lên server để nhận `400`.
function parseIsReadParam(value: string | null): ReadFilter {
  if (value === 'true') {
    return 'read'
  }
  return value === 'false' ? 'unread' : 'all'
}

function parseTabValue(value: string): ReadFilter {
  return READ_FILTERS.find((filter) => filter === value) ?? 'all'
}

function toIsRead(filter: ReadFilter): boolean | undefined {
  return filter === 'all' ? undefined : filter === 'read'
}

function parsePage(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 1 ? page : 1
}

interface NotificationListProps {
  notifications: NotificationListItem[]
  role: UserRole | undefined
  onOpen: (notification: NotificationListItem) => void
}

/**
 * Mỗi thông báo một dòng ở mọi cỡ màn hình, cả dòng bấm được. Thông báo chỉ có tiêu đề, nội dung
 * và ngày nên không dựng bảng; chưa đọc thì chữ đậm kèm chấm, không chỉ dựa vào màu nền.
 */
function NotificationList({ notifications, role, onOpen }: NotificationListProps) {
  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
      {notifications.map((notification) => (
        <li key={notification.id}>
          <NotificationRow
            notification={notification}
            targetPath={role ? getNotificationTargetPath(notification, role) : null}
            onOpen={() => onOpen(notification)}
          />
        </li>
      ))}
    </ul>
  )
}

interface NotificationRowProps {
  notification: NotificationListItem
  targetPath: string | null
  onOpen: () => void
}

function NotificationRow({ notification, targetPath, onOpen }: NotificationRowProps) {
  const { isRead } = notification
  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn('mt-1.5 size-2 shrink-0 rounded-full', isRead ? 'bg-transparent' : 'bg-primary')}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn('wrap-anywhere', isRead ? 'font-medium' : 'font-semibold')}>
          {!isRead && <span className="sr-only">Chưa đọc: </span>}
          {notification.title}
        </span>
        <span className="text-sm text-muted-foreground wrap-anywhere">{notification.content}</span>
        <span className="text-xs text-muted-foreground">{formatDate(notification.createdAt)}</span>
      </span>
    </>
  )

  const rowClassName = cn('flex w-full gap-3 p-4 text-left md:px-6', !isRead && 'bg-primary/5')
  const interactiveClassName = cn(
    rowClassName,
    'outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
  )

  if (targetPath) {
    return (
      <Link to={targetPath} onClick={onOpen} className={interactiveClassName}>
        {content}
      </Link>
    )
  }

  // Không có trang để mở: thông báo chưa đọc vẫn bấm được để đánh dấu đã đọc.
  if (!isRead) {
    return (
      <button type="button" onClick={onOpen} className={interactiveClassName}>
        {content}
      </button>
    )
  }

  return <div className={rowClassName}>{content}</div>
}

interface NotificationPaginationProps {
  page: number
  totalPages: number
  searchParams: URLSearchParams
}

/** Chỉ hiện khi có từ 2 trang; giữ nguyên bộ lọc khi chuyển trang. */
function NotificationPagination({ page, totalPages, searchParams }: NotificationPaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const pageLink = (target: number) => {
    const params = new URLSearchParams(searchParams)
    if (target > 1) {
      params.set('page', String(target))
    } else {
      params.delete('page')
    }
    return { search: params.toString() }
  }

  return (
    <Pagination>
      <PaginationContent className="gap-2">
        {page > 1 && (
          <PaginationItem>
            <PaginationPrevious to={pageLink(page - 1)} />
          </PaginationItem>
        )}
        <PaginationItem className="px-2 text-sm text-muted-foreground tabular-nums">
          Trang {page} / {totalPages}
        </PaginationItem>
        {page < totalPages && (
          <PaginationItem>
            <PaginationNext to={pageLink(page + 1)} />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  )
}

interface NotificationListEmptyProps {
  filter: ReadFilter
  /** Trang trên URL vượt quá số trang hiện có (vừa đánh dấu đã đọc khi đang lọc chưa đọc, đường dẫn cũ). */
  isPastLastPage: boolean
  searchParams: URLSearchParams
  onShowAll: () => void
}

function NotificationListEmpty({ filter, isPastLastPage, searchParams, onShowAll }: NotificationListEmptyProps) {
  if (isPastLastPage) {
    const firstPage = new URLSearchParams(searchParams)
    firstPage.delete('page')
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Trang này không còn thông báo nào</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link to={{ search: firstPage.toString() }}>Về trang đầu</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (filter !== 'all') {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Bell />
          </EmptyMedia>
          <EmptyTitle>{filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo đã đọc'}</EmptyTitle>
          {filter === 'unread' && <EmptyDescription>Bạn đã đọc hết thông báo.</EmptyDescription>}
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" variant="outline" onClick={onShowAll}>
            Xem tất cả thông báo
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Bell />
        </EmptyMedia>
        <EmptyTitle>Chưa có thông báo nào</EmptyTitle>
        <EmptyDescription>
          Khi yêu cầu thuê, hợp đồng hoặc hóa đơn của bạn có thay đổi, thông báo sẽ hiện ở đây.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function NotificationListSkeleton() {
  return (
    <div className="flex flex-col divide-y rounded-xl border bg-card" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex gap-3 p-4 md:px-6">
          <Skeleton className="mt-1.5 size-2 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}
