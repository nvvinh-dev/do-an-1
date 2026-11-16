import { Link } from 'react-router'
import StatusBadge from '@/components/StatusBadge'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { MaintenanceRequestListItem } from '@/types/maintenanceRequestTypes'
import { formatDate } from '@/utils/formatDate'
import { getMaintenanceUrgencyLabel } from '@/utils/maintenanceUrgencyLabels'

interface MaintenanceRequestListViewProps {
  maintenanceRequests: MaintenanceRequestListItem[]
  /** `/tenant/maintenance-requests` (T10) hoặc `/landlord/maintenance-requests` (L11). */
  basePath: string
  /** Query đang xem (bộ lọc, trang), gửi kèm sang trang chi tiết để nút quay lại giữ nguyên. */
  listSearch: string
}

/**
 * Danh sách sự cố dùng chung cho T10 và L11: dưới `md` mỗi sự cố một thẻ, từ `md` là bảng
 * (docs/design-system.md mục 5).
 */
export default function MaintenanceRequestListView(props: MaintenanceRequestListViewProps) {
  return (
    <>
      <MaintenanceRequestCards {...props} />
      <MaintenanceRequestTable {...props} />
    </>
  )
}

/** Dưới `md`: bấm cả thẻ để mở chi tiết. */
function MaintenanceRequestCards({ maintenanceRequests, basePath, listSearch }: MaintenanceRequestListViewProps) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {maintenanceRequests.map((maintenanceRequest) => (
        <li key={maintenanceRequest.id}>
          <Link
            to={`${basePath}/${maintenanceRequest.id}`}
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
function MaintenanceRequestTable({ maintenanceRequests, basePath, listSearch }: MaintenanceRequestListViewProps) {
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
                    to={`${basePath}/${maintenanceRequest.id}`}
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

/** Chỉ hiện khi có từ 2 trang; giữ nguyên bộ lọc khi chuyển trang. */
export function MaintenanceRequestPagination({ page, totalPages, searchParams }: MaintenanceRequestPaginationProps) {
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

export function MaintenanceRequestListSkeleton() {
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
