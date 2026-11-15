import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import PageHeader from '@/components/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminDashboard } from '@/hooks/useAdminDashboard'
import { cn } from '@/lib/utils'
import type { AdminDashboard } from '@/types/dashboardTypes'
import { getUserRoleLabel } from '@/utils/userRoleLabels'

/**
 * AD1 — Tổng quan của Admin (docs/frontend-screens.md mục 7): hồ sơ Chủ trọ chờ duyệt, số tài khoản
 * theo vai trò, số khu trọ và phòng. Mọi số do server tính (docs/api-design.md mục 12).
 */
export default function AdminDashboardPage() {
  const dashboardQuery = useAdminDashboard()

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Tổng quan" description="Hồ sơ chờ duyệt, tài khoản, khu trọ và phòng trên toàn hệ thống." />

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

  return (
    <>
      <DashboardSection title="Việc cần xử lý">
        {/* Bộ lọc nằm trên query của URL để AD2 mở đúng danh sách chờ duyệt (docs/frontend-screens.md mục 8.4). */}
        <Link
          to="/admin/landlord-applications?status=ChoDuyet"
          className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50 sm:max-w-xs"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <span
              className={cn(
                'text-2xl font-bold tabular-nums',
                pendingLandlordApplications === 0 && 'text-muted-foreground',
              )}
            >
              {pendingLandlordApplications}
            </span>
            <span className="text-sm text-muted-foreground">Hồ sơ Chủ trọ chờ duyệt</span>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      </DashboardSection>

      <DashboardSection title="Tài khoản" description="Tính cả tài khoản đang bị khóa.">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <CountTile label="Tổng tài khoản" value={users.total} />
          <CountTile label={getUserRoleLabel('Landlord')} value={users.landlords} />
          <CountTile label={getUserRoleLabel('Tenant')} value={users.tenants} />
          <CountTile label={getUserRoleLabel('Admin')} value={users.admins} />
        </dl>
      </DashboardSection>

      <DashboardSection title="Khu trọ và phòng" description="Không tính khu trọ và phòng đã lưu trữ.">
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <CountTile label="Khu trọ" value={properties} />
          <CountTile label="Phòng" value={rooms} />
        </dl>
      </DashboardSection>
    </>
  )
}

function DashboardSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Đang tải tổng quan">
      <Skeleton className="h-22 rounded-xl sm:max-w-xs" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-22 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-22 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
