import { ChevronRight, FileText } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import MoneyText from '@/components/MoneyText'
import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { useTenantDashboard } from '@/hooks/useTenantDashboard'
import { cn } from '@/lib/utils'
import type { TenantDashboard, TenantDashboardContract } from '@/types/dashboardTypes'
import { formatDate } from '@/utils/formatDate'

/**
 * T1 — Tổng quan của Người thuê (docs/frontend-screens.md mục 5): việc cần xử lý, hợp đồng hiện tại,
 * hóa đơn chưa thanh toán và tổng đã thanh toán. Mọi số do server tính (docs/api-design.md mục 12).
 */
export default function TenantDashboardPage() {
  const dashboardQuery = useTenantDashboard()

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Tổng quan" description="Việc cần xử lý, hợp đồng và hóa đơn của bạn." />

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

function DashboardContent({ dashboard }: { dashboard: TenantDashboard }) {
  const { pendingActions, contracts, unpaidInvoices, totalPaid } = dashboard

  return (
    <>
      <DashboardSection title="Việc cần xử lý">
        {/* Bộ lọc nằm trên query của URL để danh sách mở đúng trạng thái (docs/frontend-screens.md mục 8.2). */}
        <ul className="grid gap-3 sm:grid-cols-2">
          <PendingActionLink
            to="/tenant/contracts?status=ChoNguoiThueXacNhan"
            label="Hợp đồng chờ bạn xác nhận"
            count={pendingActions.contractsToConfirm}
          />
          <PendingActionLink
            to="/tenant/invoices?type=ThanhLy&status=ChoNguoiThueXacNhan"
            label="Bảng thanh lý chờ bạn đồng ý"
            count={pendingActions.settlementsToConfirm}
          />
        </ul>
      </DashboardSection>

      <DashboardSection title="Hợp đồng hiện tại" description="Không gồm hợp đồng đã thanh lý hoặc đã hủy.">
        {contracts.length === 0 ? <NoContractsEmpty /> : <ContractList contracts={contracts} />}
      </DashboardSection>

      <DashboardSection title="Hóa đơn">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/tenant/invoices"
            className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50 md:p-6"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-sm text-muted-foreground">Chưa thanh toán</span>
              <MoneyText amount={unpaidInvoices.amount} className="text-2xl font-semibold" />
              <span className="text-sm text-muted-foreground tabular-nums">
                {unpaidInvoices.count === 0
                  ? 'Không có hóa đơn nào còn phải trả'
                  : `${unpaidInvoices.count} hóa đơn còn phải trả`}
              </span>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
              Xem hóa đơn
              <ChevronRight className="size-4" />
            </span>
          </Link>
          <div className="flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm md:p-6">
            <span className="text-sm text-muted-foreground">Đã thanh toán</span>
            <MoneyText amount={totalPaid} className="text-2xl font-semibold" />
            <span className="text-sm text-muted-foreground">Tổng Chủ trọ đã xác nhận thu, không gồm tiền cọc.</span>
          </div>
        </div>
      </DashboardSection>
    </>
  )
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

/** Mỗi hợp đồng một thẻ, bấm cả thẻ để mở chi tiết ở T4. */
function ContractList({ contracts }: { contracts: TenantDashboardContract[] }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {contracts.map((contract) => (
        <li key={contract.id}>
          <Link
            to={`/tenant/contracts/${contract.id}`}
            className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground shadow-sm transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium wrap-anywhere">Phòng {contract.roomCode}</span>
              <StatusBadge kind="contract" status={contract.status} />
            </div>
            <p className="text-sm text-muted-foreground wrap-anywhere">{contract.propertyName}</p>
            <p className="text-sm">
              <MoneyText amount={contract.rentPrice} /> / tháng
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {formatDate(contract.startDate)} – {formatDate(contract.endDate)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function NoContractsEmpty() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileText />
        </EmptyMedia>
        <EmptyTitle>Bạn chưa có hợp đồng nào đang mở</EmptyTitle>
        <EmptyDescription>Tìm phòng phù hợp và gửi yêu cầu thuê để Chủ trọ lập hợp đồng.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to="/">Tìm phòng</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Đang tải tổng quan">
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-22 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
