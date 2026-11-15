import { Receipt } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import MoneyText from '@/components/MoneyText'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { InvoiceListItem } from '@/types/invoiceTypes'
import { formatDate } from '@/utils/formatDate'
import { getInvoiceTypeLabel } from '@/utils/invoiceTypeLabels'

interface InvoiceListViewProps {
  invoices: InvoiceListItem[]
  /** `/landlord/invoices` (L8) hoặc `/tenant/invoices` (T5). */
  basePath: string
  /** Query đang xem (bộ lọc, trang), gửi kèm sang trang chi tiết để nút quay lại giữ nguyên. */
  listSearch: string
  /** Chủ trọ thấy tên người thuê của từng hóa đơn; Người thuê thì không cần. */
  showTenant: boolean
}

/**
 * Danh sách hóa đơn của L8 và T5 (docs/design-system.md mục 5): dưới `md` mỗi hóa đơn một thẻ bấm được, từ `md`
 * là bảng. Hóa đơn thanh lý hiện số dư kèm chiều (FR-58) vì số âm là Chủ trọ phải hoàn.
 */
export default function InvoiceListView(props: InvoiceListViewProps) {
  return (
    <>
      <InvoiceCards {...props} />
      <InvoiceTable {...props} />
    </>
  )
}

function InvoicePeriod({ invoice }: { invoice: InvoiceListItem }) {
  return (
    <span>
      {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
    </span>
  )
}

function InvoiceAmount({ invoice, className }: { invoice: InvoiceListItem; className?: string }) {
  return <MoneyText amount={invoice.totalAmount} settlementBalance={invoice.type === 'ThanhLy'} className={className} />
}

function InvoiceCards({ invoices, basePath, listSearch, showTenant }: InvoiceListViewProps) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {invoices.map((invoice) => (
        <li key={invoice.id}>
          <Link
            to={`${basePath}/${invoice.id}`}
            state={{ listSearch }}
            className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium wrap-anywhere">Phòng {invoice.roomCode}</span>
              <StatusBadge kind="invoice" status={invoice.status} />
            </div>
            <p className="text-sm text-muted-foreground wrap-anywhere">{invoice.propertyName}</p>
            <p className="text-sm">
              {getInvoiceTypeLabel(invoice.type)} · <InvoicePeriod invoice={invoice} />
            </p>
            <InvoiceAmount invoice={invoice} className="font-semibold" />
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {showTenant && <span className="wrap-anywhere">Người thuê: {invoice.tenantName}</span>}
              {invoice.dueDate && <span>Hạn {formatDate(invoice.dueDate)}</span>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function InvoiceTable({ invoices, basePath, listSearch, showTenant }: InvoiceListViewProps) {
  return (
    <div className="hidden rounded-xl border bg-card shadow-sm md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">Phòng</TableHead>
            <TableHead>Kỳ</TableHead>
            {showTenant && <TableHead>Người thuê</TableHead>}
            <TableHead>Trạng thái</TableHead>
            <TableHead className="px-4 text-right">Số tiền</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="px-4 py-3 whitespace-normal">
                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    to={`${basePath}/${invoice.id}`}
                    state={{ listSearch }}
                    className="font-medium wrap-anywhere underline-offset-4 hover:underline"
                  >
                    Phòng {invoice.roomCode}
                  </Link>
                  <span className="text-muted-foreground wrap-anywhere">{invoice.propertyName}</span>
                </div>
              </TableCell>
              <TableCell className="py-3 whitespace-normal">
                <div className="flex flex-col gap-1">
                  <InvoicePeriod invoice={invoice} />
                  <span className="text-muted-foreground">{getInvoiceTypeLabel(invoice.type)}</span>
                </div>
              </TableCell>
              {showTenant && <TableCell className="py-3 whitespace-normal wrap-anywhere">{invoice.tenantName}</TableCell>}
              <TableCell className="py-3">
                <StatusBadge kind="invoice" status={invoice.status} />
              </TableCell>
              {/* Gộp tổng, đã thu và hạn vào một cột để bảng vừa màn 768px. */}
              <TableCell className="px-4 py-3 text-right">
                <div className="flex flex-col items-end gap-1">
                  <InvoiceAmount invoice={invoice} className="font-medium" />
                  <span className="text-muted-foreground">
                    Đã thu <MoneyText amount={invoice.paidAmount} />
                  </span>
                  {invoice.dueDate && <span className="text-muted-foreground">Hạn {formatDate(invoice.dueDate)}</span>}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface InvoicePaginationProps {
  page: number
  totalPages: number
  searchParams: URLSearchParams
}

/** Chỉ hiện khi có từ 2 trang; giữ nguyên bộ lọc khi chuyển trang. */
export function InvoicePagination({ page, totalPages, searchParams }: InvoicePaginationProps) {
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

export function InvoiceListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}

interface InvoiceListEmptyProps {
  hasFilter: boolean
  /** Trang trên URL vượt quá số trang hiện có (hóa đơn vừa đổi trạng thái, đường dẫn cũ). */
  isPastLastPage: boolean
  /** Query của trang đầu với bộ lọc đang chọn, cho nút Về trang đầu. */
  firstPageSearch: string
  onClearFilters: () => void
  /** Câu hướng dẫn và nút khi chưa có hóa đơn nào, theo vai trò. */
  emptyDescription: string
  emptyAction: ReactNode
}

export function InvoiceListEmpty({
  hasFilter,
  isPastLastPage,
  firstPageSearch,
  onClearFilters,
  emptyDescription,
  emptyAction,
}: InvoiceListEmptyProps) {
  if (isPastLastPage) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Trang này không còn hóa đơn nào</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link to={{ search: firstPageSearch }}>Về trang đầu</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (hasFilter) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Receipt />
          </EmptyMedia>
          <EmptyTitle>Không có hóa đơn nào khớp bộ lọc</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" variant="outline" onClick={onClearFilters}>
            Xem tất cả hóa đơn
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Receipt />
        </EmptyMedia>
        <EmptyTitle>Chưa có hóa đơn nào</EmptyTitle>
        <EmptyDescription>{emptyDescription}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>{emptyAction}</EmptyContent>
    </Empty>
  )
}
