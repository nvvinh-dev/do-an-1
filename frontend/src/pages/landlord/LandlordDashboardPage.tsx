import { Building2, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import MoneyText from '@/components/MoneyText'
import PageHeader from '@/components/PageHeader'
import RevenueBars from '@/components/RevenueBars'
import RoomCountsSummary from '@/components/RoomCountsSummary'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { useLandlordDashboard } from '@/hooks/useLandlordDashboard'
import { cn } from '@/lib/utils'
import type { LandlordDashboard } from '@/types/dashboardTypes'
import { formatMonth } from '@/utils/formatMonth'

/**
 * L1 — Tổng quan của Chủ trọ (docs/frontend-screens.md mục 6): việc cần xử lý, số phòng theo trạng
 * thái, hóa đơn chưa thu và doanh thu 6 tháng. Mọi số do server tính (docs/api-design.md mục 12).
 */
export default function LandlordDashboardPage() {
  const dashboardQuery = useLandlordDashboard()

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Tổng quan" description="Việc cần xử lý, phòng, hóa đơn và doanh thu của các khu trọ." />

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

function DashboardContent({ dashboard }: { dashboard: LandlordDashboard }) {
  const { pendingActions, roomCounts, unpaidInvoices, monthlyRevenue } = dashboard

  return (
    <>
      <DashboardSection title="Việc cần xử lý">
        {/* Bộ lọc nằm trên query của URL để danh sách mở đúng trạng thái (docs/frontend-screens.md mục 8.3). */}
        <ul className="grid gap-3 sm:grid-cols-3">
          <PendingActionLink
            to="/landlord/rental-requests?status=ChoDuyet"
            label="Yêu cầu thuê chờ duyệt"
            count={pendingActions.rentalRequests}
          />
          <PendingActionLink
            to="/landlord/invoices?status=ChoXacNhan"
            label="Báo thanh toán chờ xác nhận"
            count={pendingActions.paymentReports}
          />
          <PendingActionLink
            to="/landlord/contracts?status=ChoNhanCoc"
            label="Hợp đồng chờ nhận cọc"
            count={pendingActions.contractsAwaitingDeposit}
          />
        </ul>
      </DashboardSection>

      <DashboardSection title="Phòng" description="Không tính phòng đã lưu trữ.">
        {roomCounts.total === 0 ? <NoRoomsEmpty /> : <RoomCountsSummary counts={roomCounts} variant="tiles" />}
      </DashboardSection>

      <DashboardSection title="Hóa đơn chưa thu">
        <Link
          to="/landlord/invoices"
          className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50 md:p-6"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <MoneyText amount={unpaidInvoices.amount} className="text-2xl font-semibold" />
            <span className="text-sm text-muted-foreground tabular-nums">
              {unpaidInvoices.count === 0 ? 'Không có hóa đơn nào còn phải thu' : `${unpaidInvoices.count} hóa đơn còn phải thu`}
            </span>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
            Xem hóa đơn
            <ChevronRight className="size-4" />
          </span>
        </Link>
      </DashboardSection>

      <DashboardSection
        title="Doanh thu 6 tháng"
        description={revenueDescription(monthlyRevenue.map((month) => month.month))}
      >
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm md:p-6">
          <RevenueBars months={monthlyRevenue} />
          {monthlyRevenue.every((month) => month.amount === 0) && (
            <p className="text-sm text-muted-foreground">Chưa có khoản thu nào được xác nhận trong 6 tháng này.</p>
          )}
        </div>
      </DashboardSection>
    </>
  )
}

function revenueDescription(months: string[]): string {
  const range = months.length > 0 ? ` Từ ${formatMonth(months[0])} đến ${formatMonth(months[months.length - 1])}.` : ''
  return `Chỉ tính khoản đã xác nhận thu, không gồm tiền cọc.${range}`
}

function DashboardSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function PendingActionLink({ to, label, count }: { to: string; label: string; count: number }) {
  return (
    <li>
      <Link
        to={to}
        className="flex h-full items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <span className={cn('text-2xl font-semibold tabular-nums', count === 0 && 'text-muted-foreground')}>
            {count}
          </span>
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  )
}

function NoRoomsEmpty() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Building2 />
        </EmptyMedia>
        <EmptyTitle>Chưa có phòng nào đang khai thác</EmptyTitle>
        <EmptyDescription>Thêm khu trọ và phòng để bắt đầu đăng tin cho thuê.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to="/landlord/properties">Xem khu trọ</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Đang tải tổng quan">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-22 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-22 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}
