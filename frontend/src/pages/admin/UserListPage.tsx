import { LockKeyhole, LockKeyholeOpen, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import ConfirmDialog from '@/components/ConfirmDialog'
import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useLockUser } from '@/hooks/useLockUser'
import { useUnlockUser } from '@/hooks/useUnlockUser'
import { useUserList } from '@/hooks/useUserList'
import type { UserRole } from '@/types/authTypes'
import { USER_ROLES, type UserListItem } from '@/types/userAdminTypes'
import { formatDate } from '@/utils/formatDate'
import { getUserRoleLabel } from '@/utils/userRoleLabels'

/**
 * AD3 — Tài khoản (docs/frontend-screens.md mục 7): lọc theo vai trò và trạng thái khóa, khóa kèm
 * lý do, mở khóa. Bộ lọc và trang nằm trên query của URL (`?role=Landlord&isLocked=true&page=2`).
 * Khóa Chủ trọ còn hợp đồng chưa kết thúc thì hộp thoại cảnh báo trước khi xác nhận (FR-09).
 */
export default function UserListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const role = parseRole(searchParams.get('role'))
  const isLocked = parseIsLocked(searchParams.get('isLocked'))
  const page = parsePage(searchParams.get('page'))
  const listQuery = useUserList({ role, isLocked, page })
  const currentUserId = useCurrentUser().data?.id
  const [lockTarget, setLockTarget] = useState<UserListItem | null>(null)
  const [unlockTarget, setUnlockTarget] = useState<UserListItem | null>(null)

  // Đổi bộ lọc thì về trang 1, vì số trang của bộ lọc mới khác.
  const setFilters = (filters: { role: UserRole | undefined; isLocked: boolean | undefined }) => {
    const params = new URLSearchParams()
    if (filters.role) {
      params.set('role', filters.role)
    }
    if (filters.isLocked !== undefined) {
      params.set('isLocked', String(filters.isLocked))
    }
    setSearchParams(params, { replace: true })
  }

  const hasFilter = role !== undefined || isLocked !== undefined
  const actions: UserActionsProps = { currentUserId, onLock: setLockTarget, onUnlock: setUnlockTarget }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Tài khoản" description="Tài khoản trong hệ thống, đăng ký trước xếp trước." />

      <div className="grid gap-4 md:max-w-xl md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="roleFilter">Vai trò</FieldLabel>
          <NativeSelect
            id="roleFilter"
            className="w-full"
            value={role ?? ''}
            onChange={(event) => setFilters({ role: parseRole(event.target.value), isLocked })}
          >
            <NativeSelectOption value="">Tất cả vai trò</NativeSelectOption>
            {USER_ROLES.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {getUserRoleLabel(value)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="lockFilter">Trạng thái</FieldLabel>
          <NativeSelect
            id="lockFilter"
            className="w-full"
            value={isLocked === undefined ? '' : String(isLocked)}
            onChange={(event) => setFilters({ role, isLocked: parseIsLocked(event.target.value) })}
          >
            <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
            <NativeSelectOption value="false">Hoạt động</NativeSelectOption>
            <NativeSelectOption value="true">Đã khóa</NativeSelectOption>
          </NativeSelect>
        </Field>
      </div>

      {listQuery.isPending ? (
        <UserListSkeleton />
      ) : listQuery.isLoadingError ? (
        <ApiErrorAlert error={listQuery.error} onRetry={() => void listQuery.refetch()} />
      ) : (
        <>
          {/* Lần tải lại lỗi (quay lại tab) thì giữ danh sách cũ, chỉ báo lỗi kèm nút thử lại. */}
          {listQuery.isRefetchError && (
            <ApiErrorAlert error={listQuery.error} onRetry={() => void listQuery.refetch()} />
          )}
          {listQuery.data.items.length === 0 ? (
            <UserListEmpty
              isPastLastPage={page > 1 && listQuery.data.totalItems > 0}
              hasFilter={hasFilter}
              searchParams={searchParams}
              onClearFilters={() => setFilters({ role: undefined, isLocked: undefined })}
            />
          ) : (
            <>
              <UserCards users={listQuery.data.items} {...actions} />
              <UserTable users={listQuery.data.items} {...actions} />
              <UserPagination
                page={listQuery.data.page}
                totalPages={listQuery.data.totalPages}
                searchParams={searchParams}
              />
            </>
          )}
        </>
      )}

      {/* Chỉ gắn khi đang mở: đóng là gỡ, nên lỗi của lần trước không còn khi mở cho tài khoản khác. */}
      {lockTarget && <LockUserDialog user={lockTarget} onClose={() => setLockTarget(null)} />}
      {unlockTarget && <UnlockUserDialog user={unlockTarget} onClose={() => setUnlockTarget(null)} />}
    </section>
  )
}

// Giá trị lạ trên URL (gõ tay, đường dẫn cũ) thì coi như không lọc, không gửi lên server.
function parseRole(value: string | null): UserRole | undefined {
  return USER_ROLES.find((role) => role === value)
}

function parseIsLocked(value: string | null): boolean | undefined {
  if (value === 'true') {
    return true
  }
  return value === 'false' ? false : undefined
}

function parsePage(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 1 ? page : 1
}

function formatRoles(user: UserListItem): string {
  return user.roles.map(getUserRoleLabel).join(', ')
}

interface UserActionsProps {
  /** Tài khoản đang đăng nhập: không có nút khóa chính mình (server trả `422`). */
  currentUserId: number | undefined
  onLock: (user: UserListItem) => void
  onUnlock: (user: UserListItem) => void
}

function UserActionButton({
  user,
  currentUserId,
  onLock,
  onUnlock,
  className,
}: UserActionsProps & { user: UserListItem; className?: string }) {
  if (user.isLocked) {
    return (
      <Button type="button" variant="outline" size="sm" className={className} onClick={() => onUnlock(user)}>
        <LockKeyholeOpen />
        Mở khóa
      </Button>
    )
  }

  if (user.id === currentUserId) {
    return <span className="text-sm text-muted-foreground">Tài khoản của bạn</span>
  }

  return (
    <Button type="button" variant="outline" size="sm" className={className} onClick={() => onLock(user)}>
      <LockKeyhole />
      Khóa
    </Button>
  )
}

function LockReason({ reason }: { reason: string }) {
  return <p className="text-sm whitespace-pre-line wrap-anywhere text-muted-foreground">Lý do khóa: {reason}</p>
}

/** Dưới `md`: mỗi tài khoản một thẻ (docs/design-system.md mục 5). */
function UserCards({ users, ...actions }: UserActionsProps & { users: UserListItem[] }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {users.map((user) => (
        <li key={user.id} className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 font-medium wrap-anywhere">{user.fullName}</span>
            <StatusBadge kind="userAccount" status={user.isLocked ? 'BiKhoa' : 'HoatDong'} />
          </div>
          <p className="text-sm wrap-anywhere text-muted-foreground">{user.email}</p>
          <p className="text-sm text-muted-foreground">
            {formatRoles(user)} · Đăng ký ngày {formatDate(user.registeredAt)}
          </p>
          {user.phoneNumber && <p className="text-sm text-muted-foreground">{user.phoneNumber}</p>}
          {user.activeContractCount !== null && (
            <p className="text-sm text-muted-foreground">Hợp đồng chưa kết thúc: {user.activeContractCount}</p>
          )}
          {user.lockReason && <LockReason reason={user.lockReason} />}
          <UserActionButton user={user} className="mt-1 w-full" {...actions} />
        </li>
      ))}
    </ul>
  )
}

/** Từ `md`: bảng. */
function UserTable({ users, ...actions }: UserActionsProps & { users: UserListItem[] }) {
  return (
    <div className="hidden rounded-xl border bg-card shadow-sm md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">Tài khoản</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead>Trạng thái</TableHead>
            {/* Tiêu đề dài cho xuống dòng, nếu không bảng rộng hơn khung ở 1024px và cả trang cuộn ngang. */}
            <TableHead className="w-24 py-2 text-right whitespace-normal">Hợp đồng chưa kết thúc</TableHead>
            <TableHead>Ngày đăng ký</TableHead>
            <TableHead className="px-4 text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="px-4 py-3 whitespace-normal">
                <div className="flex flex-col gap-1">
                  <span className="font-medium wrap-anywhere">{user.fullName}</span>
                  <span className="wrap-anywhere text-muted-foreground">{user.email}</span>
                  {user.phoneNumber && <span className="text-muted-foreground">{user.phoneNumber}</span>}
                  {user.lockReason && <LockReason reason={user.lockReason} />}
                </div>
              </TableCell>
              <TableCell className="py-3">{formatRoles(user)}</TableCell>
              <TableCell className="py-3">
                <StatusBadge kind="userAccount" status={user.isLocked ? 'BiKhoa' : 'HoatDong'} />
              </TableCell>
              <TableCell className="py-3 text-right tabular-nums">{user.activeContractCount ?? '—'}</TableCell>
              <TableCell className="py-3">{formatDate(user.registeredAt)}</TableCell>
              <TableCell className="px-4 py-3 text-right">
                <UserActionButton user={user} {...actions} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface UserDialogProps {
  user: UserListItem
  onClose: () => void
}

/** Khóa bắt buộc lý do; Chủ trọ còn hợp đồng thì cảnh báo giới hạn đã chấp nhận ở Phase 1 (API mục 4). */
function LockUserDialog({ user, onClose }: UserDialogProps) {
  const lockMutation = useLockUser(user.id)
  const activeContractCount = user.activeContractCount ?? 0

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Khóa tài khoản"
      description={`${user.fullName} sẽ không đăng nhập được cho tới khi được mở khóa, và nhận thông báo kèm lý do. Phiên đang mở có thể dùng tiếp tối đa 60 phút.`}
      warning={
        activeContractCount > 0
          ? {
              title: `Chủ trọ này còn ${activeContractCount} hợp đồng chưa kết thúc`,
              description:
                'Trong lúc bị khóa, Chủ trọ không xác nhận được thanh toán và nhận cọc: hóa đơn của người thuê dừng ở Chờ xác nhận, hợp đồng Chờ nhận cọc có thể hết hạn giữ chỗ.',
            }
          : undefined
      }
      confirmLabel="Khóa tài khoản"
      destructive
      reason={{
        label: 'Lý do khóa',
        required: true,
        maxLength: 500,
        placeholder: 'Ví dụ: Đăng thông tin phòng sai sự thật nhiều lần.',
      }}
      isPending={lockMutation.isPending}
      error={lockMutation.error}
      onConfirm={(reason) =>
        lockMutation.mutate(
          { reason },
          {
            onSuccess: () => {
              onClose()
              toast.success('Đã khóa tài khoản')
            },
          },
        )
      }
    />
  )
}

function UnlockUserDialog({ user, onClose }: UserDialogProps) {
  const unlockMutation = useUnlockUser(user.id)

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Mở khóa tài khoản"
      description={`${user.fullName} đăng nhập lại được và nhận thông báo đã mở khóa.`}
      confirmLabel="Mở khóa"
      isPending={unlockMutation.isPending}
      error={unlockMutation.error}
      onConfirm={() =>
        unlockMutation.mutate(undefined, {
          onSuccess: () => {
            onClose()
            toast.success('Đã mở khóa tài khoản')
          },
        })
      }
    />
  )
}

interface UserPaginationProps {
  page: number
  totalPages: number
  searchParams: URLSearchParams
}

/** Chỉ hiện khi có từ 2 trang; giữ nguyên bộ lọc khi chuyển trang. */
function UserPagination({ page, totalPages, searchParams }: UserPaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <Pagination>
      <PaginationContent className="gap-2">
        {page > 1 && (
          <PaginationItem>
            <PaginationPrevious to={pageLink(searchParams, page - 1)} />
          </PaginationItem>
        )}
        <PaginationItem className="px-2 text-sm text-muted-foreground tabular-nums">
          Trang {page} / {totalPages}
        </PaginationItem>
        {page < totalPages && (
          <PaginationItem>
            <PaginationNext to={pageLink(searchParams, page + 1)} />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  )
}

function pageLink(searchParams: URLSearchParams, target: number) {
  const params = new URLSearchParams(searchParams)
  if (target > 1) {
    params.set('page', String(target))
  } else {
    params.delete('page')
  }
  return { search: params.toString() }
}

interface UserListEmptyProps {
  /** Trang trên URL vượt quá số trang hiện có (tài khoản vừa rời bộ lọc, đường dẫn cũ). */
  isPastLastPage: boolean
  hasFilter: boolean
  searchParams: URLSearchParams
  onClearFilters: () => void
}

function UserListEmpty({ isPastLastPage, hasFilter, searchParams, onClearFilters }: UserListEmptyProps) {
  if (isPastLastPage) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Trang này không còn tài khoản nào</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link to={pageLink(searchParams, 1)}>Về trang đầu</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Users />
        </EmptyMedia>
        <EmptyTitle>{hasFilter ? 'Không có tài khoản nào khớp bộ lọc' : 'Chưa có tài khoản nào'}</EmptyTitle>
      </EmptyHeader>
      {hasFilter && (
        <EmptyContent>
          <Button type="button" variant="outline" onClick={onClearFilters}>
            Xem tất cả tài khoản
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}

function UserListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  )
}
