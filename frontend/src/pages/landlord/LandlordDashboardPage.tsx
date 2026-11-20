import {
  BadgeCheck,
  ChevronRight,
  DoorClosed,
  DoorOpen,
  KeyRound,
  Plus,
  ReceiptText,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import EmptyIllustration from '@/components/EmptyIllustration'
import PageHeader from '@/components/PageHeader'
import PropertyCard from '@/components/PropertyCard'
import RevenueBars from '@/components/RevenueBars'
import StatCard from '@/components/StatCard'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useLandlordDashboard } from '@/hooks/useLandlordDashboard'
import { usePropertyList } from '@/hooks/usePropertyList'
import { cn } from '@/lib/utils'
import type { LandlordDashboard } from '@/types/dashboardTypes'
import { formatCompactCurrency } from '@/utils/formatCompactCurrency'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatGreetingDate } from '@/utils/formatGreetingDate'
import { formatMonth } from '@/utils/formatMonth'
import { formatPercentChange, getMonthOverMonthChange } from '@/utils/getMonthOverMonthChange'
import { getOccupancyPercent } from '@/utils/getOccupancyPercent'

const NEW_PROPERTY_PATH = '/landlord/properties/new'
/** Số thẻ khu trọ tối đa trên Tổng quan; xem hết ở L2. */
const MAX_PROPERTY_CARDS = 4

/**
 * L1 — Tổng quan của Chủ trọ (docs/frontend-screens.md mục 6; bố cục ở docs/design-system.md mục 5):
 * lời chào, bốn chỉ số, việc cần xử lý, khu trọ có ảnh, doanh thu 6 tháng và thao tác nhanh. Số liệu từ
 * `GET /dashboard/landlord`, khu trọ từ `GET /properties`; hai query tải và báo lỗi riêng. Tỷ lệ lấp đầy
 * và mức so với tháng trước chỉ là phép tính hiển thị trên số server trả.
 */
export default function LandlordDashboardPage() {
  const dashboardQuery = useLandlordDashboard()
  const { data: user } = useCurrentUser()
  const pendingTotal = dashboardQuery.data ? sumPendingActions(dashboardQuery.data) : null

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        greeting={formatGreetingDate()}
        title={user ? `Chào ${user.fullName}` : 'Tổng quan'}
        description={
          pendingTotal === null
            ? 'Việc cần xử lý, phòng, hóa đơn và doanh thu của các khu trọ.'
            : pendingTotal === 0
              ? 'Không có việc nào đang chờ bạn.'
              : `Hôm nay có ${pendingTotal} việc cần bạn xử lý.`
        }
        action={
          <Button asChild size="page">
            <Link to={NEW_PROPERTY_PATH}>
              <Plus />
              Thêm khu trọ
            </Link>
          </Button>
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

function sumPendingActions({ pendingActions }: LandlordDashboard): number {
  return pendingActions.rentalRequests + pendingActions.paymentReports + pendingActions.contractsAwaitingDeposit
}

function DashboardContent({ dashboard }: { dashboard: LandlordDashboard }) {
  return (
    <>
      <StatCards dashboard={dashboard} />
      {/* Từ `xl` hai cột (từ `lg` sidebar đã chiếm 256px nên chưa đủ chỗ): cột chính là việc cần xử lý và khu trọ, cột phụ là doanh thu và thao tác nhanh. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <PendingActions dashboard={dashboard} />
          <PropertiesSection />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <RevenuePanel dashboard={dashboard} />
          <QuickActions />
        </div>
      </div>
    </>
  )
}

function StatCards({ dashboard }: { dashboard: LandlordDashboard }) {
  const { roomCounts, unpaidInvoices, monthlyRevenue } = dashboard
  const occupancy = getOccupancyPercent(roomCounts.dangThue, roomCounts.total)
  const share = (count: number) => (roomCounts.total === 0 ? 0 : (count / roomCounts.total) * 100)

  const currentMonth = monthlyRevenue.at(-1)
  const previousMonth = monthlyRevenue.at(-2)
  const change = currentMonth && previousMonth ? getMonthOverMonthChange(currentMonth.amount, previousMonth.amount) : null

  return (
    <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Chỉ số chính">
      <li>
        <StatCard
          label="Phòng đang thuê"
          icon={DoorClosed}
          tint="teal"
          value={roomCounts.dangThue}
          valueSuffix={`/ ${roomCounts.total}`}
          bar={[
            { percent: share(roomCounts.dangThue), className: 'bg-chart-1' },
            { percent: share(roomCounts.dangGiuCho), className: 'bg-chart-3' },
          ]}
          footnote={occupancy === null ? 'Chưa có phòng' : `Lấp đầy ${occupancy}%`}
        />
      </li>
      <li>
        <StatCard
          label="Phòng trống"
          icon={DoorOpen}
          tint="sky"
          value={roomCounts.trong}
          footnote={`${roomCounts.dangGiuCho} giữ chỗ · ${roomCounts.baoTri} bảo trì`}
        />
      </li>
      <li>
        <StatCard
          label="Chưa thu"
          icon={ReceiptText}
          tint="highlight"
          value={<CompactMoney amount={unpaidInvoices.amount} />}
          footnote={
            unpaidInvoices.count === 0
              ? 'Không có hóa đơn nào còn phải thu'
              : `${unpaidInvoices.count} hóa đơn còn phải thu`
          }
          to="/landlord/invoices"
        />
      </li>
      <li>
        <StatCard
          label={currentMonth ? `Thu tháng ${Number(currentMonth.month.split('-')[1])}` : 'Thu tháng này'}
          icon={Wallet}
          tint="amber"
          value={<CompactMoney amount={currentMonth?.amount ?? 0} />}
          footnote={
            change === null || !previousMonth
              ? 'Tháng trước chưa có khoản thu'
              : `${formatPercentChange(change)} so với tháng ${Number(previousMonth.month.split('-')[1])}`
          }
          footnoteTone={change !== null && change > 0 ? 'success' : 'default'}
        />
      </li>
    </ul>
  )
}

/** Số tiền rút gọn cho thẻ chỉ số ("12,5 tr"); trình đọc màn hình đọc số đầy đủ. */
function CompactMoney({ amount }: { amount: number }) {
  return (
    <>
      <span aria-hidden="true">{formatCompactCurrency(amount)}</span>
      <span className="sr-only">{formatCurrency(amount)}</span>
    </>
  )
}

interface PendingItem {
  to: string
  count: number
  title: string
  hint: string
  emptyHint: string
  verb: string
}

/** Việc cần xử lý (docs/design-system.md mục 5); bộ lọc nằm trên query của URL để danh sách mở đúng trạng thái. */
function PendingActions({ dashboard }: { dashboard: LandlordDashboard }) {
  const { pendingActions } = dashboard
  const total = sumPendingActions(dashboard)
  const items: PendingItem[] = [
    {
      to: '/landlord/rental-requests?status=ChoDuyet',
      count: pendingActions.rentalRequests,
      title: 'Yêu cầu thuê chờ duyệt',
      hint: 'Người thuê đang chờ bạn phản hồi',
      emptyHint: 'Không có yêu cầu nào đang chờ duyệt',
      verb: 'Duyệt',
    },
    {
      to: '/landlord/invoices?status=ChoXacNhan',
      count: pendingActions.paymentReports,
      title: 'Báo thanh toán chờ xác nhận',
      hint: 'Người thuê đã báo chuyển tiền',
      emptyHint: 'Không có báo thanh toán nào',
      verb: 'Xác nhận',
    },
    {
      to: '/landlord/contracts?status=ChoNhanCoc',
      count: pendingActions.contractsAwaitingDeposit,
      title: 'Hợp đồng chờ nhận cọc',
      hint: 'Xác nhận khi đã nhận tiền cọc',
      emptyHint: 'Không có hợp đồng nào chờ cọc',
      verb: 'Xem',
    },
  ]

  return (
    <div className="overflow-hidden rounded-xl border border-highlight-soft bg-card">
      <div className="flex items-center justify-between gap-3 bg-highlight-soft/40 px-4 py-3">
        <h2 className="text-lg font-bold">Việc cần xử lý</h2>
        <span className="text-sm text-muted-foreground tabular-nums">{total} việc</span>
      </div>
      <ul className="bg-highlight-soft/40">
        {items.map((item) => {
          const hasWork = item.count > 0
          return (
            <li key={item.to} className="border-t border-highlight-soft">
              <Link
                to={item.to}
                className="grid min-h-14 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 outline-none transition-colors hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <span
                  className={cn(
                    'grid size-10 place-items-center rounded-[10px] text-lg tabular-nums',
                    hasWork
                      ? 'bg-highlight-soft font-extrabold text-highlight-soft-foreground'
                      : 'bg-muted font-semibold text-muted-foreground',
                  )}
                >
                  {item.count}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold">{item.title}</span>
                  <span className="text-sm text-muted-foreground">{hasWork ? item.hint : item.emptyHint}</span>
                </span>
                <span
                  className={cn(
                    'flex items-center gap-1 text-sm',
                    hasWork ? 'font-semibold text-primary' : 'text-muted-foreground',
                  )}
                >
                  <span className="hidden sm:inline">{item.verb}</span>
                  <ChevronRight aria-hidden="true" className="size-4" />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold">{title}</h2>
      {action}
    </div>
  )
}

/** Khu trọ đang khai thác có ảnh; query riêng nên lỗi ở đây không làm mất phần còn lại của trang. */
function PropertiesSection() {
  const propertiesQuery = usePropertyList(false)
  const properties = propertiesQuery.data ?? []

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle
        title="Khu trọ của bạn"
        action={
          properties.length > 0 && (
            <Link
              to="/landlord/properties"
              className="flex items-center gap-0.5 rounded-md text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              Xem tất cả
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          )
        }
      />
      {propertiesQuery.isPending ? (
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Đang tải khu trọ">
          {Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : propertiesQuery.isLoadingError ? (
        <ApiErrorAlert error={propertiesQuery.error} onRetry={() => void propertiesQuery.refetch()} />
      ) : (
        <>
          {propertiesQuery.isRefetchError && (
            <ApiErrorAlert error={propertiesQuery.error} onRetry={() => void propertiesQuery.refetch()} />
          )}
          {properties.length === 0 ? (
            <NoPropertiesEmpty />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {properties.slice(0, MAX_PROPERTY_CARDS).map((property) => (
                <li key={property.id}>
                  <PropertyCard property={property} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function NoPropertiesEmpty() {
  return (
    <Empty className="border bg-card">
      <EmptyHeader>
        <EmptyIllustration kind="house" />
        <EmptyTitle>Chưa có khu trọ nào đang khai thác</EmptyTitle>
        <EmptyDescription>Thêm khu trọ và phòng để bắt đầu đăng tin cho thuê.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to={NEW_PROPERTY_PATH}>
            <Plus />
            Thêm khu trọ
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function RevenuePanel({ dashboard }: { dashboard: LandlordDashboard }) {
  const { monthlyRevenue, unpaidInvoices } = dashboard
  const total = monthlyRevenue.reduce((sum, month) => sum + month.amount, 0)
  const range =
    monthlyRevenue.length > 0
      ? ` Từ ${formatMonth(monthlyRevenue[0].month)} đến ${formatMonth(monthlyRevenue[monthlyRevenue.length - 1].month)}.`
      : ''

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">Doanh thu 6 tháng</h2>
        <p className="text-2xl font-bold tracking-tight tabular-nums">{formatCurrency(total)}</p>
        <p className="text-sm text-muted-foreground">Đã xác nhận thu, không gồm tiền cọc.{range}</p>
      </div>
      <RevenueBars months={monthlyRevenue} compactLabels className="h-44" />
      {monthlyRevenue.every((month) => month.amount === 0) && (
        <p className="text-sm text-muted-foreground">Chưa có khoản thu nào được xác nhận trong 6 tháng này.</p>
      )}
      <Link
        to="/landlord/invoices"
        className="flex items-center gap-3 rounded-lg bg-muted p-3 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-card text-primary">
          <ReceiptText className="size-[18px]" strokeWidth={1.75} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-bold tabular-nums">{formatCurrency(unpaidInvoices.amount)}</span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {unpaidInvoices.count === 0 ? 'Không có hóa đơn nào chưa thu' : `${unpaidInvoices.count} hóa đơn chưa thu`}
          </span>
        </span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </div>
  )
}

const QUICK_ACTIONS: { label: string; to: string; icon: LucideIcon }[] = [
  { label: 'Thêm khu trọ', to: NEW_PROPERTY_PATH, icon: Plus },
  { label: 'Duyệt yêu cầu thuê', to: '/landlord/rental-requests?status=ChoDuyet', icon: KeyRound },
  { label: 'Xác nhận thanh toán', to: '/landlord/invoices?status=ChoXacNhan', icon: BadgeCheck },
  { label: 'Xử lý sự cố', to: '/landlord/maintenance-requests', icon: Wrench },
]

/** Lối tắt tới các màn đã có (docs/design-system.md mục 5); không thêm hành động sản phẩm chưa hỗ trợ. */
function QuickActions() {
  return (
    <div className="flex flex-col gap-3">
      <SectionTitle title="Thao tác nhanh" />
      <ul className="flex flex-col gap-2">
        {QUICK_ACTIONS.map((action) => (
          <li key={action.to}>
            <Link
              to={action.to}
              className="flex min-h-11 items-center gap-3 rounded-lg border bg-card px-3 font-medium outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <action.icon aria-hidden="true" className="size-4 text-primary" />
              <span className="flex-1">{action.label}</span>
              <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
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
          <Skeleton className="h-56 rounded-xl" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
