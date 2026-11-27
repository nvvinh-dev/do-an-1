import { Building2, DoorClosed, FileUser, History, ShieldCheck, UsersRound, type LucideIcon } from 'lucide-react'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import PageHeader from '@/components/PageHeader'
import PendingActionList, { type PendingActionItem } from '@/components/PendingActionList'
import QuickActionList, { type QuickAction } from '@/components/QuickActionList'
import StatCard from '@/components/StatCard'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminDashboard } from '@/hooks/useAdminDashboard'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import type { AdminDashboard } from '@/types/dashboardTypes'
import type { UserRole } from '@/types/authTypes'
import { formatGreetingDate } from '@/utils/formatGreetingDate'
import { tintClasses, type NavTint } from '@/utils/tintClasses'
import { getUserRoleLabel } from '@/utils/userRoleLabels'

// Bộ lọc nằm trên query của URL để AD2 mở đúng danh sách chờ duyệt (docs/frontend-screens.md mục 8.4).
const PENDING_APPLICATIONS_PATH = '/admin/landlord-applications?status=ChoDuyet'

/** Lối tắt tới các màn đã có của Admin (docs/frontend-screens.md mục 7, AD1). */
const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Duyệt hồ sơ Chủ trọ', to: PENDING_APPLICATIONS_PATH, icon: FileUser },
  { label: 'Quản lý tài khoản', to: '/admin/users', icon: UsersRound },
  { label: 'Tra cứu nhật ký', to: '/admin/audit-logs', icon: History },
]

/** Vai trò trong khối số tài khoản, mỗi vai trò một ô icon có sắc (docs/design-system.md mục 4). */
const ROLE_ROWS: { role: UserRole; key: 'landlords' | 'tenants' | 'admins'; icon: LucideIcon; tint: NavTint }[] = [
  { role: 'Landlord', key: 'landlords', icon: Building2, tint: 'sky' },
  { role: 'Tenant', key: 'tenants', icon: UsersRound, tint: 'violet' },
  { role: 'Admin', key: 'admins', icon: ShieldCheck, tint: 'slate' },
]

/**
 * AD1 — Tổng quan của Admin (docs/frontend-screens.md mục 7; bố cục ở docs/design-system.md mục 5): lời
 * chào, bốn chỉ số, hồ sơ Chủ trọ chờ duyệt, số tài khoản theo vai trò và thao tác nhanh. Mọi số do
 * server tính (docs/api-design.md mục 12).
 */
export default function AdminDashboardPage() {
  const dashboardQuery = useAdminDashboard()
  const { data: user } = useCurrentUser()
  const pending = dashboardQuery.data?.pendingLandlordApplications

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        greeting={formatGreetingDate()}
        title={user ? `Chào ${user.fullName}` : 'Tổng quan'}
        description={
          pending === undefined
            ? 'Hồ sơ Chủ trọ chờ duyệt, tài khoản, khu trọ và phòng trên hệ thống.'
            : pending === 0
              ? 'Không có hồ sơ Chủ trọ nào đang chờ bạn duyệt.'
              : `Có ${pending} hồ sơ Chủ trọ đang chờ bạn duyệt.`
        }
      />

      {dashboardQuery.isPending ? (
        <DashboardSkeleton />
      ) : dashboardQuery.isLoadingError ? (
        <ApiErrorAlert error={dashboardQuery.error} onRetry={() => void dashboardQuery.refetch()} />
      ) : (
        <>
          {/* Lần tải lại lỗi (quay lại tab) thì giữ số cũ, chỉ báo lỗi kèm nút thử lại. */}
          {dashboardQuery.isRefetchError && (
            <ApiErrorAlert error={dashboardQuery.error} onRetry={() => void dashboardQuery.refetch()} />
          )}
          <DashboardContent dashboard={dashboardQuery.data} />
        </>
      )}
    </section>
  )
}

function DashboardContent({ dashboard }: { dashboard: AdminDashboard }) {
  const { users, properties, rooms, pendingLandlordApplications } = dashboard
  const pendingItems: PendingActionItem[] = [
    {
      to: PENDING_APPLICATIONS_PATH,
      count: pendingLandlordApplications,
      title: 'Hồ sơ Chủ trọ chờ duyệt',
      hint: 'Gọi điện xác minh số điện thoại trước khi duyệt',
      verb: 'Duyệt',
    },
  ]

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Chỉ số chính">
        <li>
          <StatCard
            label="Tài khoản"
            icon={UsersRound}
            tint="emerald"
            value={users.total}
            footnote={`${users.landlords} Chủ trọ · ${users.tenants} Người thuê`}
            to="/admin/users"
          />
        </li>
        <li>
          <StatCard
            label="Khu trọ"
            icon={Building2}
            tint="sky"
            value={properties}
            footnote="Không tính khu đã lưu trữ"
          />
        </li>
        <li>
          <StatCard label="Phòng" icon={DoorClosed} tint="teal" value={rooms} footnote="Không tính phòng đã lưu trữ" />
        </li>
        <li>
          <StatCard
            label="Hồ sơ chờ duyệt"
            icon={FileUser}
            tint="highlight"
            value={pendingLandlordApplications}
            footnote={pendingLandlordApplications === 0 ? 'Không có hồ sơ nào chờ' : 'Đang chờ bạn duyệt'}
            to={PENDING_APPLICATIONS_PATH}
          />
        </li>
      </ul>

      {/* Từ `xl` hai cột: cột chính là việc cần xử lý và số tài khoản, cột phụ là thao tác nhanh. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <PendingActionList items={pendingItems} />
          <UsersByRole users={users} />
        </div>
        <QuickActionList actions={QUICK_ACTIONS} />
      </div>
    </>
  )
}

/** Số tài khoản theo vai trò kèm thanh tỷ lệ trên tổng; số đã ghi bằng chữ, thanh chỉ để nhìn. */
function UsersByRole({ users }: { users: AdminDashboard['users'] }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">Tài khoản theo vai trò</h2>
        <p className="text-sm text-muted-foreground">Tính cả tài khoản đang bị khóa.</p>
      </div>
      <ul className="flex flex-col gap-4">
        {ROLE_ROWS.map(({ role, key, icon: Icon, tint }) => {
          const count = users[key]
          const percent = users.total === 0 ? 0 : (count / users.total) * 100
          return (
            <li key={role} className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3">
              <span aria-hidden="true" className={`grid size-9 place-items-center rounded-[10px] ${tintClasses[tint]}`}>
                <Icon className="size-[18px]" strokeWidth={1.75} />
              </span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{getUserRoleLabel(role)}</span>
                  <span className="font-bold tabular-nums">{count}</span>
                </div>
                <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-chart-1" style={{ width: `${percent}%` }} />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Đang tải tổng quan">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  )
}
