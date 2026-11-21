import { Check, Inbox, Phone, Send, ShieldBan, Undo2, UsersRound, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import ConfirmDialog from '@/components/ConfirmDialog'
import PageHeader from '@/components/PageHeader'
import RoommateActionError from '@/components/RoommateActionError'
import RoommateProfileFacts from '@/components/RoommateProfileFacts'
import StatusBadge from '@/components/StatusBadge'
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
import { useRoommateConnections } from '@/hooks/useRoommateConnections'
import { useRoommateInvitationList } from '@/hooks/useRoommateInvitationList'
import { useRoommateMutation } from '@/hooks/useRoommateMutation'
import { useRoommateProfile } from '@/hooks/useRoommateProfile'
import {
  acceptRoommateInvitation,
  blockRoommateProfile,
  rejectRoommateInvitation,
  withdrawRoommateInvitation,
} from '@/services/roommateService'
import type { RoommateConnection, RoommateInvitation, RoommateInvitationDirection } from '@/types/roommateTypes'
import { formatDate } from '@/utils/formatDate'
import { formatDateTime } from '@/utils/formatDateTime'

type TabValue = RoommateInvitationDirection | 'connections'

const PAGE_SIZE = 20

/**
 * T9 — Lời mời và kết nối ở ghép (docs/frontend-screens.md mục 5). Ba thẻ: lời mời đã nhận, đã gửi và
 * các kết nối. Thẻ và trang nằm trên query của URL (`?tab=sent&page=2`), để thông báo `RoommateInvitation`
 * mở thẳng tới đây và tải lại vẫn giữ chỗ đang xem. Họ tên và số điện thoại chỉ hiện ở mục Kết nối (BR-25).
 */
export default function RoommateInvitationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseTab(searchParams.get('tab'))
  const page = parsePage(searchParams.get('page'))

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="Lời mời ở ghép"
        description="Lời mời kết nối bạn đã nhận và đã gửi. Khi hai bên đồng ý, họ tên và số điện thoại hiện ở mục Kết nối."
        action={
          <Button asChild variant="outline" size="page">
            <Link to="/tenant/roommate">Tìm bạn ở ghép</Link>
          </Button>
        }
      />

      <Tabs
        value={tab}
        // Đổi thẻ thì về trang 1, vì số trang của thẻ mới khác.
        onValueChange={(value) => setSearchParams({ tab: parseTab(value) }, { replace: true })}
        className="gap-6"
      >
        <TabsList className="w-full md:w-fit">
          <TabsTrigger value="received" className="md:px-4">
            Đã nhận
          </TabsTrigger>
          <TabsTrigger value="sent" className="md:px-4">
            Đã gửi
          </TabsTrigger>
          <TabsTrigger value="connections" className="md:px-4">
            Kết nối
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="flex flex-col gap-4">
          <InvitationList direction="received" page={page} active={tab === 'received'} searchParams={searchParams} />
        </TabsContent>
        <TabsContent value="sent" className="flex flex-col gap-4">
          <InvitationList direction="sent" page={page} active={tab === 'sent'} searchParams={searchParams} />
        </TabsContent>
        <TabsContent value="connections" className="flex flex-col gap-4">
          <ConnectionList active={tab === 'connections'} />
        </TabsContent>
      </Tabs>
    </section>
  )
}

// Giá trị lạ trên URL (gõ tay, đường dẫn cũ) thì về thẻ Đã nhận.
function parseTab(value: string | null): TabValue {
  return value === 'sent' || value === 'connections' ? value : 'received'
}

function parsePage(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 1 ? page : 1
}

interface InvitationListProps {
  direction: RoommateInvitationDirection
  page: number
  active: boolean
  searchParams: URLSearchParams
}

function InvitationList({ direction, page, active, searchParams }: InvitationListProps) {
  const listQuery = useRoommateInvitationList({ direction, page, pageSize: PAGE_SIZE }, active)

  if (listQuery.isPending) {
    return <ListSkeleton />
  }
  if (listQuery.isLoadingError) {
    return <ApiErrorAlert error={listQuery.error} onRetry={() => void listQuery.refetch()} />
  }

  const { items, totalPages, totalItems } = listQuery.data

  return (
    <>
      {listQuery.isRefetchError && <ApiErrorAlert error={listQuery.error} onRetry={() => void listQuery.refetch()} />}
      {items.length === 0 ? (
        page > 1 && totalItems > 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>Trang này không còn lời mời nào</EmptyTitle>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="outline">
                <Link to={{ search: `tab=${direction}` }}>Về trang đầu</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <InvitationEmpty direction={direction} />
        )
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {items.map((invitation) => (
              <InvitationRow key={invitation.id} invitation={invitation} direction={direction} />
            ))}
          </ul>
          <ListPagination page={page} totalPages={totalPages} searchParams={searchParams} />
        </>
      )}
    </>
  )
}

function InvitationEmpty({ direction }: { direction: RoommateInvitationDirection }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">{direction === 'received' ? <Inbox /> : <Send />}</EmptyMedia>
        <EmptyTitle>{direction === 'received' ? 'Chưa nhận lời mời nào' : 'Chưa gửi lời mời nào'}</EmptyTitle>
        <EmptyDescription>
          {direction === 'received'
            ? 'Khi có người thuê mời bạn ở ghép, lời mời hiện ở đây kèm hồ sơ của họ.'
            : 'Chọn một ứng viên phù hợp ở trang Tìm bạn ở ghép rồi gửi lời mời.'}
        </EmptyDescription>
      </EmptyHeader>
      {direction === 'sent' && (
        <EmptyContent>
          <Button asChild>
            <Link to="/tenant/roommate">Tìm bạn ở ghép</Link>
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}

type ConfirmAction = 'reject' | 'withdraw' | 'block'

const CONFIRM_TEXTS: Record<ConfirmAction, { title: string; description: string; confirmLabel: string }> = {
  reject: {
    title: 'Từ chối lời mời?',
    description: 'Người gửi sẽ không gửi lại lời mời cho bạn được nữa.',
    confirmLabel: 'Từ chối',
  },
  withdraw: {
    title: 'Rút lời mời?',
    description: 'Lời mời chuyển sang Đã rút và không khôi phục được.',
    confirmLabel: 'Rút lời mời',
  },
  block: {
    title: 'Chặn người này?',
    description:
      'Hai bên sẽ không thấy hồ sơ của nhau và không gửi lời mời cho nhau được; lời mời đang chờ giữa hai bên bị rút. Bạn có thể bỏ chặn ở trang Hồ sơ ở ghép.',
    confirmLabel: 'Chặn',
  },
}

interface InvitationRowProps {
  invitation: RoommateInvitation
  direction: RoommateInvitationDirection
}

/** Một lời mời và thao tác theo trạng thái, theo bảng T9 ở docs/frontend-screens.md mục 5. */
function InvitationRow({ invitation, direction }: InvitationRowProps) {
  const { id, status, sentAt, respondedAt, profileId } = invitation
  const [showProfile, setShowProfile] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const acceptMutation = useRoommateMutation(() => acceptRoommateInvitation(id))
  const rejectMutation = useRoommateMutation(() => rejectRoommateInvitation(id))
  const withdrawMutation = useRoommateMutation(() => withdrawRoommateInvitation(id))
  const blockMutation = useRoommateMutation((targetProfileId: number) => blockRoommateProfile(targetProfileId))
  const isBusy = acceptMutation.isPending || rejectMutation.isPending || withdrawMutation.isPending || blockMutation.isPending

  const isPending = status === 'ChoPhanHoi'
  const isReceived = direction === 'received'
  const confirmMutation =
    confirmAction === 'reject' ? rejectMutation : confirmAction === 'withdraw' ? withdrawMutation : blockMutation

  const runConfirm = () => {
    const onSuccess = () => {
      setConfirmAction(null)
      toast.success(
        confirmAction === 'reject' ? 'Đã từ chối lời mời' : confirmAction === 'withdraw' ? 'Đã rút lời mời' : 'Đã chặn',
      )
    }
    if (confirmAction === 'reject') rejectMutation.mutate(undefined, { onSuccess })
    else if (confirmAction === 'withdraw') withdrawMutation.mutate(undefined, { onSuccess })
    else if (confirmAction === 'block' && profileId !== null) blockMutation.mutate(profileId, { onSuccess })
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-semibold">{isReceived ? 'Lời mời ở ghép tới bạn' : 'Lời mời bạn đã gửi'}</span>
          <span className="text-sm text-muted-foreground">
            Gửi lúc {formatDateTime(sentAt)}
            {respondedAt && ` · Phản hồi lúc ${formatDateTime(respondedAt)}`}
          </span>
        </div>
        <StatusBadge kind="roommateInvitation" status={status} />
      </div>

      {profileId === null ? (
        <p className="text-sm text-muted-foreground">Bên kia đã xóa hồ sơ ở ghép.</p>
      ) : (
        <>
          <Button
            type="button"
            variant="link"
            className="h-auto self-start p-0"
            aria-expanded={showProfile}
            onClick={() => setShowProfile((current) => !current)}
          >
            {showProfile ? 'Ẩn hồ sơ' : isReceived ? 'Xem hồ sơ người gửi' : 'Xem hồ sơ người nhận'}
          </Button>
          {showProfile && <InvitationProfile profileId={profileId} />}
        </>
      )}

      {status === 'DaChapNhan' && (
        <p className="text-sm">
          Hai bên đã kết nối. Họ tên và số điện thoại ở thẻ{' '}
          <Link to={{ search: 'tab=connections' }} className="text-primary underline underline-offset-4">
            Kết nối
          </Link>
          .
        </p>
      )}

      <RoommateActionError error={acceptMutation.error} />

      {isPending && (
        <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
          {isReceived ? (
            <>
              {profileId !== null && (
                <Button type="button" variant="outline" disabled={isBusy} onClick={() => setConfirmAction('block')}>
                  <ShieldBan />
                  Chặn
                </Button>
              )}
              <Button type="button" variant="outline" disabled={isBusy} onClick={() => setConfirmAction('reject')}>
                <X />
                Từ chối
              </Button>
              <Button
                type="button"
                disabled={isBusy}
                onClick={() =>
                  acceptMutation.mutate(undefined, { onSuccess: () => toast.success('Đã chấp nhận lời mời') })
                }
              >
                {acceptMutation.isPending ? <Spinner /> : <Check />}
                Chấp nhận
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" disabled={isBusy} onClick={() => setConfirmAction('withdraw')}>
              <Undo2 />
              Rút lời mời
            </Button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction ? CONFIRM_TEXTS[confirmAction].title : ''}
        description={confirmAction ? CONFIRM_TEXTS[confirmAction].description : ''}
        confirmLabel={confirmAction ? CONFIRM_TEXTS[confirmAction].confirmLabel : ''}
        destructive
        isPending={confirmMutation.isPending}
        error={confirmMutation.error}
        onConfirm={runConfirm}
      />
    </li>
  )
}

/**
 * Hồ sơ bên kia, tải khi mở xem. `null` (server trả `404` vì một bên đã chặn, FR-118) là trạng thái bình
 * thường: hiện "Không còn xem được hồ sơ", không coi là lỗi hệ thống.
 */
function InvitationProfile({ profileId }: { profileId: number }) {
  const profileQuery = useRoommateProfile(profileId, true)

  if (profileQuery.isPending) {
    return <Skeleton className="h-24 w-full" />
  }
  if (profileQuery.isError) {
    return <ApiErrorAlert error={profileQuery.error} onRetry={() => void profileQuery.refetch()} />
  }
  if (profileQuery.data === null) {
    return <p className="text-sm text-muted-foreground">Không còn xem được hồ sơ này.</p>
  }
  return (
    <div className="rounded-lg bg-muted p-3">
      <RoommateProfileFacts profile={profileQuery.data} />
    </div>
  )
}

function ConnectionList({ active }: { active: boolean }) {
  const connectionsQuery = useRoommateConnections(active)

  if (connectionsQuery.isPending) {
    return <ListSkeleton />
  }
  if (connectionsQuery.isLoadingError) {
    return <ApiErrorAlert error={connectionsQuery.error} onRetry={() => void connectionsQuery.refetch()} />
  }
  if (connectionsQuery.data.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersRound />
          </EmptyMedia>
          <EmptyTitle>Chưa có kết nối nào</EmptyTitle>
          <EmptyDescription>Khi một lời mời được chấp nhận, họ tên và số điện thoại của bên kia hiện ở đây.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      {connectionsQuery.isRefetchError && (
        <ApiErrorAlert error={connectionsQuery.error} onRetry={() => void connectionsQuery.refetch()} />
      )}
      <ul className="flex flex-col gap-3">
        {connectionsQuery.data.map((connection) => (
          <ConnectionRow key={connection.invitationId} connection={connection} />
        ))}
      </ul>
    </>
  )
}

/** Một kết nối; bên kia đã xóa số điện thoại thì `phoneNumber` là `null`. */
function ConnectionRow({ connection }: { connection: RoommateConnection }) {
  const { fullName, phoneNumber, connectedAt } = connection

  return (
    <li className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <UsersRound className="size-5 shrink-0 text-muted-foreground" />
        <div className="flex min-w-0 flex-col">
          <span className="font-semibold wrap-anywhere">{fullName}</span>
          <span className="text-sm text-muted-foreground">Kết nối ngày {formatDate(connectedAt)}</span>
        </div>
      </div>
      {phoneNumber ? (
        <Button asChild variant="outline" className="sm:shrink-0">
          <a href={`tel:${phoneNumber}`}>
            <Phone />
            <span className="tabular-nums">{phoneNumber}</span>
          </a>
        </Button>
      ) : (
        <span className="text-sm text-muted-foreground">Chưa có số điện thoại</span>
      )}
    </li>
  )
}

interface ListPaginationProps {
  page: number
  totalPages: number
  searchParams: URLSearchParams
}

function ListPagination({ page, totalPages, searchParams }: ListPaginationProps) {
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

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      ))}
    </div>
  )
}
