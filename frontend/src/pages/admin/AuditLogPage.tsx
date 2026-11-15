import { History, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import AuditLogChangeTable from '@/components/AuditLogChangeTable'
import AuditLogFilterForm from '@/components/AuditLogFilterForm'
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuditLogList } from '@/hooks/useAuditLogList'
import { cn } from '@/lib/utils'
import type { AuditLog, AuditLogActor, AuditLogFilters } from '@/types/auditLogTypes'
import { getAuditActionLabel, getAuditEntityTypeLabel } from '@/utils/auditLogLabels'
import {
  countActiveAuditLogFilters,
  parseAuditLogFilters,
  toAuditLogListParams,
  toAuditLogQuery,
} from '@/utils/auditLogParams'
import { formatDateTime } from '@/utils/formatDateTime'

/**
 * AD4 — Nhật ký (docs/frontend-screens.md mục 7): tra cứu theo FR-64, mới nhất trước, phân trang. Bộ
 * lọc và trang nằm trên query của URL để tải lại, gửi đường dẫn vẫn giữ đúng kết quả. Bấm một dòng mở
 * bảng so sánh trước – sau. Nhật ký chỉ đọc: trang không có thao tác sửa, xóa nào (QR-03).
 */
export default function AuditLogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseAuditLogFilters(searchParams)
  const listQuery = useAuditLogList(toAuditLogListParams(filters))
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null)
  const activeFilterCount = countActiveAuditLogFilters(filters)
  const selectedLog = listQuery.data?.items.find((log) => log.id === selectedLogId)

  const applyFilters = (next: AuditLogFilters) => {
    setSearchParams(toAuditLogQuery(next), { replace: true })
    setFiltersOpen(false)
  }
  const clearFilters = () => applyFilters({ page: 1 })

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Nhật ký" description="Tra cứu các thao tác quan trọng đã thực hiện, mới nhất xếp trước." />

      <div className="flex flex-col gap-4">
        <Button
          type="button"
          variant="outline"
          className="self-end lg:hidden"
          aria-expanded={filtersOpen}
          aria-controls="audit-log-filters"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal />
          Bộ lọc{activeFilterCount > 0 && ` (${activeFilterCount})`}
        </Button>

        <div id="audit-log-filters" className={cn(!filtersOpen && 'hidden', 'lg:block')}>
          {/* Dựng lại form khi URL đổi (quay lại, xóa bộ lọc) để ô nhập khớp bộ lọc đang áp dụng. */}
          <AuditLogFilterForm
            key={searchParams.toString()}
            filters={filters}
            onApply={applyFilters}
            onClear={clearFilters}
          />
        </div>
      </div>

      {listQuery.isPending ? (
        <AuditLogListSkeleton />
      ) : listQuery.isLoadingError ? (
        <ApiErrorAlert error={listQuery.error} onRetry={() => void listQuery.refetch()} />
      ) : (
        <>
          {/* Lần tải lại lỗi (quay lại tab) thì giữ danh sách cũ, chỉ báo lỗi kèm nút thử lại. */}
          {listQuery.isRefetchError && (
            <ApiErrorAlert error={listQuery.error} onRetry={() => void listQuery.refetch()} />
          )}
          {listQuery.data.items.length === 0 ? (
            <AuditLogListEmpty
              isPastLastPage={filters.page > 1 && listQuery.data.totalItems > 0}
              hasFilters={activeFilterCount > 0}
              firstPageQuery={toAuditLogQuery({ ...filters, page: 1 }).toString()}
              onClearFilters={clearFilters}
            />
          ) : (
            <>
              <AuditLogCards logs={listQuery.data.items} onSelect={setSelectedLogId} />
              <AuditLogTable logs={listQuery.data.items} onSelect={setSelectedLogId} />
              <AuditLogPagination
                page={listQuery.data.page}
                totalPages={listQuery.data.totalPages}
                filters={filters}
              />
            </>
          )}
        </>
      )}

      {selectedLog && <AuditLogDetailSheet log={selectedLog} onClose={() => setSelectedLogId(null)} />}
    </section>
  )
}

function formatEntity(log: AuditLog): string {
  return `${getAuditEntityTypeLabel(log.entityType)} #${log.entityId}`
}

interface AuditLogListViewProps {
  logs: AuditLog[]
  onSelect: (logId: number) => void
}

/** Dưới `md`: mỗi dòng nhật ký một thẻ, bấm cả thẻ để xem so sánh (docs/design-system.md mục 5). */
function AuditLogCards({ logs, onSelect }: AuditLogListViewProps) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {logs.map((log) => (
        <li key={log.id}>
          <button
            type="button"
            onClick={() => onSelect(log.id)}
            className="flex w-full flex-col gap-1 rounded-xl border bg-card p-4 text-left text-card-foreground shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="font-medium wrap-anywhere">{getAuditActionLabel(log.action)}</span>
            <span className="text-sm wrap-anywhere">{formatEntity(log)}</span>
            <span className="text-sm text-muted-foreground wrap-anywhere">
              {log.actor.fullName} (mã {log.actor.id})
            </span>
            <span className="text-sm text-muted-foreground tabular-nums">{formatDateTime(log.occurredAt)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Từ `md`: bảng; nút cuối dòng mở so sánh trước – sau. */
function AuditLogTable({ logs, onSelect }: AuditLogListViewProps) {
  return (
    <div className="hidden rounded-xl border bg-card shadow-sm md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">Thời điểm</TableHead>
            <TableHead>Thao tác</TableHead>
            <TableHead>Đối tượng</TableHead>
            <TableHead>Người thực hiện</TableHead>
            <TableHead className="px-4">
              <span className="sr-only">Xem thay đổi</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="px-4 py-3 tabular-nums">{formatDateTime(log.occurredAt)}</TableCell>
              <TableCell className="py-3 font-medium whitespace-normal wrap-anywhere">
                {getAuditActionLabel(log.action)}
              </TableCell>
              <TableCell className="py-3 whitespace-normal wrap-anywhere">{formatEntity(log)}</TableCell>
              <TableCell className="py-3 whitespace-normal">
                <ActorSummary actor={log.actor} />
              </TableCell>
              <TableCell className="px-4 py-3 text-right">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={`Xem thay đổi của ${getAuditActionLabel(log.action)}, ${formatEntity(log)}`}
                  onClick={() => onSelect(log.id)}
                >
                  Xem
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ActorSummary({ actor }: { actor: AuditLogActor }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="wrap-anywhere">
        {actor.fullName} <span className="text-muted-foreground">(mã {actor.id})</span>
      </span>
      {actor.email && <span className="text-sm text-muted-foreground wrap-anywhere">{actor.email}</span>}
    </div>
  )
}

interface AuditLogDetailSheetProps {
  log: AuditLog
  onClose: () => void
}

/** Chi tiết một dòng nhật ký: ai làm gì, lúc nào và bảng so sánh trước – sau. */
function AuditLogDetailSheet({ log, onClose }: AuditLogDetailSheetProps) {
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader className="pr-12">
          <SheetTitle className="wrap-anywhere">{getAuditActionLabel(log.action)}</SheetTitle>
          <SheetDescription className="wrap-anywhere">
            {formatEntity(log)} · {formatDateTime(log.occurredAt)}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">
          <ActorSummary actor={log.actor} />
          <AuditLogChangeTable log={log} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

interface AuditLogPaginationProps {
  page: number
  totalPages: number
  filters: AuditLogFilters
}

/** Chỉ hiện khi có từ 2 trang; giữ nguyên bộ lọc khi chuyển trang. */
function AuditLogPagination({ page, totalPages, filters }: AuditLogPaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const pageLink = (target: number) => ({ search: toAuditLogQuery({ ...filters, page: target }).toString() })

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

interface AuditLogListEmptyProps {
  /** Trang trên URL vượt quá số trang hiện có (đường dẫn cũ, gõ tay). */
  isPastLastPage: boolean
  hasFilters: boolean
  /** Query của trang 1 với bộ lọc đang áp dụng. */
  firstPageQuery: string
  onClearFilters: () => void
}

function AuditLogListEmpty({ isPastLastPage, hasFilters, firstPageQuery, onClearFilters }: AuditLogListEmptyProps) {
  if (isPastLastPage) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Trang này không còn nhật ký nào</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link to={{ search: firstPageQuery }}>Về trang đầu</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (hasFilters) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <History />
          </EmptyMedia>
          <EmptyTitle>Không có nhật ký nào khớp bộ lọc</EmptyTitle>
          <EmptyDescription>Thử nới khoảng thời gian hoặc bỏ bớt tiêu chí.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" variant="outline" onClick={onClearFilters}>
            Xóa bộ lọc
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <History />
        </EmptyMedia>
        <EmptyTitle>Chưa có nhật ký nào</EmptyTitle>
        <EmptyDescription>Các thao tác như duyệt hồ sơ, sửa hóa đơn, khóa tài khoản sẽ hiện ở đây.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function AuditLogListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  )
}
