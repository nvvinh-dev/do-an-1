import { FileCheck } from 'lucide-react'
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
import { useLandlordApplicationList } from '@/hooks/useLandlordApplicationList'
import {
  LANDLORD_APPLICATION_STATUSES,
  type LandlordApplicationListItem,
  type LandlordApplicationStatus,
} from '@/types/landlordApplicationTypes'
import { formatDate } from '@/utils/formatDate'
import { getStatusDisplay } from '@/utils/statusLabels'

/**
 * AD2 — Hồ sơ Chủ trọ (docs/frontend-screens.md mục 7): mới nộp trước, lọc theo trạng thái, phân
 * trang. Bộ lọc và trang nằm trên query của URL (`?status=ChoDuyet&page=2`) để quay lại từ trang
 * duyệt vẫn giữ chỗ đang xem, và AD1 mở thẳng được danh sách hồ sơ chờ duyệt.
 */
export default function LandlordApplicationListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = parseStatus(searchParams.get('status'))
  const page = parsePage(searchParams.get('page'))
  const listQuery = useLandlordApplicationList({ status, page })

  // Đổi bộ lọc thì về trang 1, vì số trang của trạng thái mới khác.
  const setStatus = (nextStatus: LandlordApplicationStatus | undefined) => {
    setSearchParams(nextStatus ? { status: nextStatus } : {}, { replace: true })
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Hồ sơ Chủ trọ"
        description="Hồ sơ đăng ký làm Chủ trọ của người dùng, mới nộp xếp trước."
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
          {LANDLORD_APPLICATION_STATUSES.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {getStatusDisplay('landlordApplication', value).label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      {listQuery.isPending ? (
        <ApplicationListSkeleton />
      ) : listQuery.isLoadingError ? (
        <ApiErrorAlert error={listQuery.error} onRetry={() => void listQuery.refetch()} />
      ) : (
        <>
          {/* Lần tải lại lỗi (quay lại tab) thì giữ danh sách cũ, chỉ báo lỗi kèm nút thử lại. */}
          {listQuery.isRefetchError && (
            <ApiErrorAlert error={listQuery.error} onRetry={() => void listQuery.refetch()} />
          )}
          {listQuery.data.items.length === 0 ? (
            <ApplicationListEmpty
              status={status}
              isPastLastPage={page > 1 && listQuery.data.totalItems > 0}
              onClearStatus={() => setStatus(undefined)}
            />
          ) : (
            <>
              <ApplicationCards applications={listQuery.data.items} listSearch={searchParams.toString()} />
              <ApplicationTable applications={listQuery.data.items} listSearch={searchParams.toString()} />
              <ApplicationPagination
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
function parseStatus(value: string | null): LandlordApplicationStatus | undefined {
  return LANDLORD_APPLICATION_STATUSES.find((status) => status === value)
}

function parsePage(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 1 ? page : 1
}

function applicationPath(id: number) {
  return `/admin/landlord-applications/${id}`
}

interface ApplicationListViewProps {
  applications: LandlordApplicationListItem[]
  /** Query đang xem (`status`, `page`), gửi kèm sang trang duyệt để nút quay lại giữ nguyên. */
  listSearch: string
}

/** Dưới `md`: mỗi hồ sơ một thẻ, bấm cả thẻ để mở trang duyệt (docs/design-system.md mục 5). */
function ApplicationCards({ applications, listSearch }: ApplicationListViewProps) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {applications.map((application) => (
        <li key={application.id}>
          <Link
            to={applicationPath(application.id)}
            state={{ listSearch }}
            className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium wrap-anywhere">{application.applicantFullName}</span>
              <StatusBadge kind="landlordApplication" status={application.status} />
            </div>
            <p className="text-sm text-muted-foreground wrap-anywhere">{application.applicantEmail}</p>
            <p className="text-sm text-muted-foreground">Nộp ngày {formatDate(application.submittedAt)}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Từ `md`: bảng; tên người nộp là liên kết tới trang duyệt. */
function ApplicationTable({ applications, listSearch }: ApplicationListViewProps) {
  return (
    <div className="hidden rounded-xl border bg-card shadow-sm md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">Người nộp</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="px-4">Ngày nộp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => (
            <TableRow key={application.id}>
              <TableCell className="px-4 py-3 whitespace-normal">
                <Link
                  to={applicationPath(application.id)}
                  state={{ listSearch }}
                  className="font-medium wrap-anywhere underline-offset-4 hover:underline"
                >
                  {application.applicantFullName}
                </Link>
              </TableCell>
              <TableCell className="py-3 whitespace-normal wrap-anywhere text-muted-foreground">
                {application.applicantEmail}
              </TableCell>
              <TableCell className="py-3">
                <StatusBadge kind="landlordApplication" status={application.status} />
              </TableCell>
              <TableCell className="px-4 py-3">{formatDate(application.submittedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface ApplicationPaginationProps {
  page: number
  totalPages: number
  searchParams: URLSearchParams
}

/** Chỉ hiện khi có từ 2 trang; giữ nguyên bộ lọc trạng thái khi chuyển trang. */
function ApplicationPagination({ page, totalPages, searchParams }: ApplicationPaginationProps) {
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

interface ApplicationListEmptyProps {
  status: LandlordApplicationStatus | undefined
  /** Trang trên URL vượt quá số trang hiện có (hồ sơ vừa được xử lý, đường dẫn cũ). */
  isPastLastPage: boolean
  onClearStatus: () => void
}

function ApplicationListEmpty({ status, isPastLastPage, onClearStatus }: ApplicationListEmptyProps) {
  if (isPastLastPage) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Trang này không còn hồ sơ nào</EmptyTitle>
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
            <FileCheck />
          </EmptyMedia>
          <EmptyTitle>
            Không có hồ sơ nào ở trạng thái {getStatusDisplay('landlordApplication', status).label.toLowerCase()}
          </EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" variant="outline" onClick={onClearStatus}>
            Xem tất cả hồ sơ
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileCheck />
        </EmptyMedia>
        <EmptyTitle>Chưa có hồ sơ Chủ trọ nào</EmptyTitle>
        <EmptyDescription>Người thuê nộp hồ sơ đăng ký làm Chủ trọ thì hồ sơ hiện ở đây để duyệt.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function ApplicationListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  )
}
