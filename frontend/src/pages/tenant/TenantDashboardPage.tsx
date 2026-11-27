import { CalendarRange, ReceiptText, Search, Wallet, Wrench } from 'lucide-react'
import { Link } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import CompactMoneyText from '@/components/CompactMoneyText'
import EmptyIllustration from '@/components/EmptyIllustration'
import MoneyText from '@/components/MoneyText'
import PageHeader from '@/components/PageHeader'
import PendingActionList, { type PendingActionItem } from '@/components/PendingActionList'
import QuickActionList, { type QuickAction } from '@/components/QuickActionList'
import StatCard from '@/components/StatCard'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useTenantDashboard } from '@/hooks/useTenantDashboard'
import type { TenantDashboard, TenantDashboardContract } from '@/types/dashboardTypes'
import { formatDate } from '@/utils/formatDate'
import { formatGreetingDate } from '@/utils/formatGreetingDate'
import { sumPendingActions } from '@/utils/sumPendingActions'

/** Lối tắt tới các màn đã có của Người thuê (docs/frontend-screens.md mục 5, T1). */
const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Tìm phòng', to: '/', icon: Search },
  { label: 'Xem hóa đơn', to: '/tenant/invoices', icon: ReceiptText },
  { label: 'Báo sự cố', to: '/tenant/maintenance-requests/new', icon: Wrench },
]

/**
 * T1 — Tổng quan của Người thuê (docs/frontend-screens.md mục 5; bố cục ở docs/design-system.md mục 5):
 * lời chào, tiền chưa thanh toán và đã thanh toán, việc cần xử lý, hợp đồng hiện tại và thao tác nhanh.
 * Mọi số do server tính (docs/api-design.md mục 12).
 */
export default function TenantDashboardPage() {
  const dashboardQuery = useTenantDashboard()
  const { data: user } = useCurrentUser()
  const pendingTotal = dashboardQuery.data ? sumPendingActions(dashboardQuery.data.pendingActions) : null

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        greeting={formatGreetingDate()}
        title={user ? `Chào ${user.fullName}` : 'Tổng quan'}
        description={
          pendingTotal === null
            ? 'Việc cần xử lý, hợp đồng và hóa đơn của bạn.'
            : pendingTotal === 0
              ? 'Không có việc nào đang chờ bạn.'
              : `Hôm nay có ${pendingTotal} việc cần bạn xử lý.`
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

function DashboardContent({ dashboard }: { dashboard: TenantDashboard }) {
  const { pendingActions, contracts, unpaidInvoices, totalPaid } = dashboard

  // Bộ lọc nằm trên query của URL để danh sách mở đúng trạng thái (docs/frontend-screens.md mục 8.2).
  const pendingItems: PendingActionItem[] = [
    {
      to: '/tenant/contracts?status=ChoNguoiThueXacNhan',
      count: pendingActions.contractsToConfirm,
      title: 'Hợp đồng chờ bạn xác nhận',
      hint: 'Đọc kỹ điều khoản rồi xác nhận hoặc yêu cầu sửa',
      verb: 'Xem',
    },
    {
      to: '/tenant/contracts?status=ChoNhanCoc',
      count: pendingActions.depositsToTransfer,
      title: 'Tiền cọc cần chuyển',
      hint: 'Chuyển cọc trước khi hết hạn giữ chỗ',
      verb: 'Chuyển',
    },
    {
      // T5 lọc được một trạng thái nên mở không lọc; hóa đơn còn phải trả nằm ở đầu vì kỳ mới xếp trước.
      to: '/tenant/invoices',
      count: pendingActions.invoicesToPay,
      title: 'Hóa đơn cần thanh toán',
      hint: 'Chưa trả hoặc mới trả một phần',
      verb: 'Trả',
    },
    {
      to: '/tenant/maintenance-requests?status=ChoNguoiThueXacNhan',
      count: pendingActions.maintenanceToConfirm,
      title: 'Sự cố chờ bạn xác nhận',
      hint: 'Chủ trọ báo đã sửa xong, kiểm tra rồi xác nhận',
      verb: 'Xác nhận',
    },
    {
      to: '/tenant/invoices?type=ThanhLy&status=ChoNguoiThueXacNhan',
      count: pendingActions.settlementsToConfirm,
      title: 'Bảng thanh lý chờ bạn đồng ý',
      hint: 'Kiểm tra các khoản khấu trừ trước khi đồng ý',
      verb: 'Xem',
    },
  ]

  return (
    <>
      <ul className="grid grid-cols-2 gap-3" aria-label="Chỉ số chính">
        <li>
          <StatCard
            label="Chưa thanh toán"
            icon={ReceiptText}
            tint="highlight"
            value={<CompactMoneyText amount={unpaidInvoices.amount} />}
            footnote={
              unpaidInvoices.count === 0
                ? 'Không có hóa đơn nào còn phải trả'
                : `${unpaidInvoices.count} hóa đơn còn phải trả`
            }
            to="/tenant/invoices"
          />
        </li>
        <li>
          <StatCard
            label="Đã thanh toán"
            icon={Wallet}
            tint="emerald"
            value={<CompactMoneyText amount={totalPaid} />}
            footnote="Chủ trọ đã xác nhận thu, không gồm tiền cọc"
          />
        </li>
      </ul>

      {/* Từ `xl` hai cột: cột chính là việc cần xử lý và hợp đồng, cột phụ là thao tác nhanh. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <PendingActionList items={pendingItems} />
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold">Hợp đồng hiện tại</h2>
              <p className="text-sm text-muted-foreground">Không gồm hợp đồng đã thanh lý hoặc đã hủy.</p>
            </div>
            {contracts.length === 0 ? <NoContractsEmpty /> : <ContractList contracts={contracts} />}
          </div>
        </div>
        <QuickActionList actions={QUICK_ACTIONS} />
      </div>
    </>
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
            className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground shadow-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold wrap-anywhere">Phòng {contract.roomCode}</span>
              <StatusBadge kind="contract" status={contract.status} />
            </div>
            <p className="text-sm text-muted-foreground wrap-anywhere">{contract.propertyName}</p>
            <p className="font-bold text-primary">
              <MoneyText amount={contract.rentPrice} />{' '}
              <span className="text-sm font-normal text-muted-foreground">/ tháng</span>
            </p>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
              <CalendarRange aria-hidden="true" className="size-4" strokeWidth={1.75} />
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
    <Empty className="border bg-card">
      <EmptyHeader>
        <EmptyIllustration kind="document" />
        <EmptyTitle>Bạn chưa có hợp đồng nào đang mở</EmptyTitle>
        <EmptyDescription>Tìm phòng phù hợp và gửi yêu cầu thuê để Chủ trọ lập hợp đồng.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to="/">
            <Search />
            Tìm phòng
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Đang tải tổng quan">
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-44 rounded-xl" />
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  )
}
