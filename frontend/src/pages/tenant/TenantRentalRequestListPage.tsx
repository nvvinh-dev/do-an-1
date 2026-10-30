import { FileText, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import CountdownText from '@/components/CountdownText'
import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
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
import { useRentalRequestList } from '@/hooks/useRentalRequestList'
import {
  RENTAL_REQUEST_STATUSES,
  type RentalRequestListItem,
  type RentalRequestStatus,
} from '@/types/rentalRequestTypes'
import { formatDate } from '@/utils/formatDate'
import { getStatusDisplay } from '@/utils/statusLabels'

/**
 * T3 — Yêu cầu thuê của tôi (docs/frontend-screens.md mục 5): mới gửi trước, lọc theo trạng thái,
 * phân trang. Bộ lọc và trang nằm trên query của URL (`?status=ChoDuyet&page=2`) để quay lại từ
 * trang chi tiết vẫn giữ chỗ đang xem.
 */
export default function TenantRentalRequestListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = parseStatus(searchParams.get('status'))
  const page = parsePage(searchParams.get('page'))
  const listQuery = useRentalRequestList({ status, page })

  // Đổi bộ lọc thì về trang 1, vì số trang của trạng thái mới khác.
  const setStatus = (nextStatus: RentalRequestStatus | undefined) => {
    setSearchParams(nextStatus ? { status: nextStatus } : {}, { replace: true })
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Yêu cầu thuê" description="Các yêu cầu thuê phòng bạn đã gửi, mới gửi xếp trước." />

      <Field className="md:max-w-xs">
        <FieldLabel htmlFor="statusFilter">Trạng thái</FieldLabel>
        <NativeSelect
          id="statusFilter"
          className="w-full"
          value={status ?? ''}
          onChange={(event) => setStatus(parseStatus(event.target.value))}
        >
          <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
          {RENTAL_REQUEST_STATUSES.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {getStatusDisplay('rentalRequest', value).label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      {listQuery.isPending ? (
        <RentalRequestListSkeleton />
      ) : listQuery.isLoadingError ? (
        <ApiErrorAlert error={listQuery.error} onRetry={() => void listQuery.refetch()} />
      ) : (
        <>
          {/* Lần tải lại lỗi (quay lại tab, tải lại sau khi rút) thì giữ danh sách cũ, chỉ báo lỗi kèm nút thử lại. */}
          {listQuery.isRefetchError && (
            <ApiErrorAlert error={listQuery.error} onRetry={() => void listQuery.refetch()} />
          )}
          {listQuery.data.items.length === 0 ? (
            <RentalRequestListEmpty
              status={status}
              isPastLastPage={page > 1 && listQuery.data.totalItems > 0}
              onClearStatus={() => setStatus(undefined)}
            />
          ) : (
            <>
              <RentalRequestCards rentalRequests={listQuery.data.items} />
              <RentalRequestTable rentalRequests={listQuery.data.items} />
              <RentalRequestPagination
                page={listQuery.data.page}
                totalPages={listQuery.data.totalPages}
                searchParams={searchParams}
              />
            </>
          )}
        </>
      )}
    </section>
  )
}

// Giá trị lạ trên URL (gõ tay, đường dẫn cũ) thì coi như không lọc, không gửi lên server để nhận `400`.
function parseStatus(value: string | null): RentalRequestStatus | undefined {
  return RENTAL_REQUEST_STATUSES.find((status) => status === value)
}

function parsePage(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 1 ? page : 1
}

function rentalRequestPath(id: number) {
  return `/tenant/rental-requests/${id}`
}

/** Hạn đang chạy: hạn duyệt khi chờ duyệt, hạn giữ chỗ khi đã duyệt; trạng thái khác không có. */
function RentalRequestDeadline({ rentalRequest }: { rentalRequest: RentalRequestListItem }) {
  if (rentalRequest.expiresAt) {
    return (
      <span>
        Hạn duyệt: <CountdownText expiresAt={rentalRequest.expiresAt} />
      </span>
    )
  }
  if (rentalRequest.holdExpiresAt) {
    return (
      <span>
        Giữ chỗ: <CountdownText expiresAt={rentalRequest.holdExpiresAt} />
      </span>
    )
  }
  return null
}

/** Dưới `md`: mỗi yêu cầu một thẻ, bấm cả thẻ để mở chi tiết (docs/design-system.md mục 5). */
function RentalRequestCards({ rentalRequests }: { rentalRequests: RentalRequestListItem[] }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {rentalRequests.map((rentalRequest) => (
        <li key={rentalRequest.id}>
          <Link
            to={rentalRequestPath(rentalRequest.id)}
            className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium wrap-anywhere">Phòng {rentalRequest.room.code}</span>
              <StatusBadge kind="rentalRequest" status={rentalRequest.status} />
            </div>
            <p className="text-sm text-muted-foreground wrap-anywhere">{rentalRequest.room.propertyName}</p>
            <p className="text-sm">
              Vào ở ngày {formatDate(rentalRequest.expectedMoveInDate)} · {rentalRequest.expectedOccupants} người
            </p>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>Gửi ngày {formatDate(rentalRequest.submittedAt)}</span>
              <RentalRequestDeadline rentalRequest={rentalRequest} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Từ `md`: bảng; mã phòng là liên kết tới chi tiết. */
function RentalRequestTable({ rentalRequests }: { rentalRequests: RentalRequestListItem[] }) {
  return (
    <div className="hidden rounded-xl border bg-card shadow-sm md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">Phòng</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Ngày dự kiến vào ở</TableHead>
            <TableHead>Số người</TableHead>
            <TableHead>Ngày gửi</TableHead>
            <TableHead className="px-4">Hạn</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rentalRequests.map((rentalRequest) => (
            <TableRow key={rentalRequest.id}>
              <TableCell className="px-4 py-3 whitespace-normal">
                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    to={rentalRequestPath(rentalRequest.id)}
                    className="font-medium wrap-anywhere underline-offset-4 hover:underline"
                  >
                    Phòng {rentalRequest.room.code}
                  </Link>
                  <span className="text-muted-foreground wrap-anywhere">{rentalRequest.room.propertyName}</span>
                </div>
              </TableCell>
              <TableCell className="py-3">
                <StatusBadge kind="rentalRequest" status={rentalRequest.status} />
              </TableCell>
              <TableCell className="py-3">{formatDate(rentalRequest.expectedMoveInDate)}</TableCell>
              <TableCell className="py-3 tabular-nums">{rentalRequest.expectedOccupants}</TableCell>
              <TableCell className="py-3">{formatDate(rentalRequest.submittedAt)}</TableCell>
              <TableCell className="px-4 py-3 whitespace-normal">
                <RentalRequestDeadline rentalRequest={rentalRequest} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface RentalRequestPaginationProps {
  page: number
  totalPages: number
  searchParams: URLSearchParams
}

/** Chỉ hiện khi có từ 2 trang; giữ nguyên bộ lọc trạng thái khi chuyển trang. */
function RentalRequestPagination({ page, totalPages, searchParams }: RentalRequestPaginationProps) {
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

interface RentalRequestListEmptyProps {
  status: RentalRequestStatus | undefined
  /** Trang trên URL vượt quá số trang hiện có (yêu cầu vừa đổi trạng thái, đường dẫn cũ). */
  isPastLastPage: boolean
  onClearStatus: () => void
}

function RentalRequestListEmpty({ status, isPastLastPage, onClearStatus }: RentalRequestListEmptyProps) {
  if (isPastLastPage) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Trang này không còn yêu cầu nào</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link to={{ search: status ? `status=${status}` : '' }}>Về trang đầu</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (status) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>
            Không có yêu cầu nào ở trạng thái {getStatusDisplay('rentalRequest', status).label.toLowerCase()}
          </EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" variant="outline" onClick={onClearStatus}>
            Xem tất cả yêu cầu
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileText />
        </EmptyMedia>
        <EmptyTitle>Chưa có yêu cầu thuê nào</EmptyTitle>
        <EmptyDescription>Tìm phòng phù hợp rồi bấm Gửi yêu cầu thuê ở trang chi tiết phòng.</EmptyDescription>
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

function RentalRequestListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}
