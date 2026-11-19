import { Plus, Wrench } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
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
import { useMaintenanceRequestList } from '@/hooks/useMaintenanceRequestList'
import {
  MAINTENANCE_REQUEST_STATUSES,
  type MaintenanceRequestListItem,
  type MaintenanceRequestStatus,
} from '@/types/maintenanceRequestTypes'
import { formatDate } from '@/utils/formatDate'
import { getMaintenanceUrgencyLabel } from '@/utils/maintenanceUrgencyLabels'
import { getStatusDisplay } from '@/utils/statusLabels'

/**
 * T10 — Sự cố của tôi (docs/frontend-screens.md mục 5): mới gửi trước, lọc theo trạng thái, phân
 * trang. Bộ lọc và trang nằm trên query của URL (`?status=DangXuLy&page=2`) để quay lại từ trang
 * chi tiết vẫn giữ chỗ đang xem.
 */
export default function TenantMaintenanceRequestListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = parseStatus(searchParams.get('status'))
  const page = parsePage(searchParams.get('page'))
  const listQuery = useMaintenanceRequestList({ status, page })

  // Đổi bộ lọc thì về trang 1, vì số trang của trạng thái mới khác.
  const setStatus = (nextStatus: MaintenanceRequestStatus | undefined) => {
    setSearchParams(nextStatus ? { status: nextStatus } : {}, { replace: true })
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Sự cố"
        description="Các sự cố bạn đã báo cho Chủ trọ, mới gửi xếp trước."
        action={
          <Button asChild size="page">
            <Link to="/tenant/maintenance-requests/new">
              <Plus />
              Báo sự cố
            </Link>
          </Button>
        }
      />

      <Field className="md:max-w-xs">
        <FieldLabel htmlFor="statusFilter">Trạng thái</FieldLabel>
        <NativeSelect
          id="statusFilter"
          className="w-full"
          value={status ?? ''}
          onChange={(event) => setStatus(parseStatus(event.target.value))}
        >
          <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
          {MAINTENANCE_REQUEST_STATUSES.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {getStatusDisplay('maintenanceRequest', value).label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      {listQuery.isPending ? (
        <MaintenanceRequestListSkeleton />
      ) : listQuery.isLoadingError ? (
        <ApiErrorAlert error={listQuery.error} onRetry={() => void listQuery.refetch()} />
      ) : (
        <>
          {/* Lần tải lại lỗi (quay lại tab sau khi chụp ảnh...) thì giữ danh sách cũ, chỉ báo lỗi kèm nút thử lại. */}
          {listQuery.isRefetchError && (
            <ApiErrorAlert error={listQuery.error} onRetry={() => void listQuery.refetch()} />
          )}
          {listQuery.data.items.length === 0 ? (
            <MaintenanceRequestListEmpty
              status={status}
              isPastLastPage={page > 1 && listQuery.data.totalItems > 0}
              onClearStatus={() => setStatus(undefined)}
            />
          ) : (
            <>
              <MaintenanceRequestCards
                maintenanceRequests={listQuery.data.items}
                listSearch={searchParams.toString()}
              />
              <MaintenanceRequestTable
                maintenanceRequests={listQuery.data.items}
                listSearch={searchParams.toString()}
              />
              <MaintenanceRequestPagination
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
function parseStatus(value: string | null): MaintenanceRequestStatus | undefined {
  return MAINTENANCE_REQUEST_STATUSES.find((status) => status === value)
}

function parsePage(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 1 ? page : 1
}

function maintenanceRequestPath(id: number) {
  return `/tenant/maintenance-requests/${id}`
}

interface MaintenanceRequestListViewProps {
  maintenanceRequests: MaintenanceRequestListItem[]
  /** Query đang xem (`status`, `page`), gửi kèm sang trang chi tiết để nút quay lại giữ nguyên. */
  listSearch: string
}

/** Dưới `md`: mỗi sự cố một thẻ, bấm cả thẻ để mở chi tiết (docs/design-system.md mục 5). */
function MaintenanceRequestCards({ maintenanceRequests, listSearch }: MaintenanceRequestListViewProps) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {maintenanceRequests.map((maintenanceRequest) => (
        <li key={maintenanceRequest.id}>
          <Link
            to={maintenanceRequestPath(maintenanceRequest.id)}
            state={{ listSearch }}
            className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="min-w-0 font-medium wrap-anywhere">{maintenanceRequest.title}</span>
              <StatusBadge kind="maintenanceRequest" status={maintenanceRequest.status} />
            </div>
            <p className="text-sm text-muted-foreground wrap-anywhere">
              Sự cố #{maintenanceRequest.id} · Phòng {maintenanceRequest.roomCode} · {maintenanceRequest.propertyName}
            </p>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>Gửi ngày {formatDate(maintenanceRequest.createdAt)}</span>
              <span>Mức: {getMaintenanceUrgencyLabel(maintenanceRequest.urgency)}</span>
            </div>
            {maintenanceRequest.expectedCompletionDate && (
              <p className="text-sm">Dự kiến sửa xong {formatDate(maintenanceRequest.expectedCompletionDate)}</p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Từ `md`: bảng; tiêu đề là liên kết tới chi tiết. */
function MaintenanceRequestTable({ maintenanceRequests, listSearch }: MaintenanceRequestListViewProps) {
  return (
    <div className="hidden rounded-xl border bg-card shadow-sm md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">Sự cố</TableHead>
            <TableHead>Phòng</TableHead>
            <TableHead>Mức khẩn cấp</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Ngày gửi</TableHead>
            <TableHead className="px-4">Dự kiến sửa xong</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {maintenanceRequests.map((maintenanceRequest) => (
            <TableRow key={maintenanceRequest.id}>
              <TableCell className="px-4 py-3 whitespace-normal">
                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    to={maintenanceRequestPath(maintenanceRequest.id)}
                    state={{ listSearch }}
                    className="font-medium wrap-anywhere underline-offset-4 hover:underline"
                  >
                    {maintenanceRequest.title}
                  </Link>
                  <span className="text-muted-foreground tabular-nums">#{maintenanceRequest.id}</span>
                </div>
              </TableCell>
              <TableCell className="py-3 whitespace-normal">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="wrap-anywhere">Phòng {maintenanceRequest.roomCode}</span>
                  <span className="text-muted-foreground wrap-anywhere">{maintenanceRequest.propertyName}</span>
                </div>
              </TableCell>
              <TableCell className="py-3">{getMaintenanceUrgencyLabel(maintenanceRequest.urgency)}</TableCell>
              <TableCell className="py-3">
                <StatusBadge kind="maintenanceRequest" status={maintenanceRequest.status} />
              </TableCell>
              <TableCell className="py-3">{formatDate(maintenanceRequest.createdAt)}</TableCell>
              <TableCell className="px-4 py-3">
                {maintenanceRequest.expectedCompletionDate ? (
                  formatDate(maintenanceRequest.expectedCompletionDate)
                ) : (
                  <span className="text-muted-foreground">Chưa có</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface MaintenanceRequestPaginationProps {
  page: number
  totalPages: number
  searchParams: URLSearchParams
}

/** Chỉ hiện khi có từ 2 trang; giữ nguyên bộ lọc trạng thái khi chuyển trang. */
function MaintenanceRequestPagination({ page, totalPages, searchParams }: MaintenanceRequestPaginationProps) {
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

interface MaintenanceRequestListEmptyProps {
  status: MaintenanceRequestStatus | undefined
  /** Trang trên URL vượt quá số trang hiện có (sự cố vừa đổi trạng thái, đường dẫn cũ). */
  isPastLastPage: boolean
  onClearStatus: () => void
}

function MaintenanceRequestListEmpty({ status, isPastLastPage, onClearStatus }: MaintenanceRequestListEmptyProps) {
  if (isPastLastPage) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Trang này không còn sự cố nào</EmptyTitle>
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
            <Wrench />
          </EmptyMedia>
          <EmptyTitle>
            Không có sự cố nào ở trạng thái {getStatusDisplay('maintenanceRequest', status).label.toLowerCase()}
          </EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" variant="outline" onClick={onClearStatus}>
            Xem tất cả sự cố
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Wrench />
        </EmptyMedia>
        <EmptyTitle>Chưa báo sự cố nào</EmptyTitle>
        <EmptyDescription>
          Phòng có hỏng hóc như rò nước, mất điện, hỏng khóa thì báo cho Chủ trọ kèm ảnh chụp để theo dõi việc sửa.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to="/tenant/maintenance-requests/new">
            <Plus />
            Báo sự cố
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function MaintenanceRequestListSkeleton() {
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
