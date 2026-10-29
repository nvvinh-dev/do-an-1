import { FileText } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import CountdownText from '@/components/CountdownText'
import MoneyText from '@/components/MoneyText'
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
import { useContractList } from '@/hooks/useContractList'
import { CONTRACT_STATUSES, type ContractListItem, type ContractStatus } from '@/types/contractTypes'
import { formatDate } from '@/utils/formatDate'
import { getStatusDisplay } from '@/utils/statusLabels'

/**
 * T4 — Hợp đồng của tôi (docs/frontend-screens.md mục 5): mới lập trước, lọc theo trạng thái, phân
 * trang. Bộ lọc và trang nằm trên query của URL (`?status=ChoNguoiThueXacNhan&page=2`) để T1 dẫn
 * thẳng tới hợp đồng chờ xác nhận, và quay lại từ trang chi tiết vẫn giữ chỗ đang xem.
 */
export default function TenantContractListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = parseStatus(searchParams.get('status'))
  const page = parsePage(searchParams.get('page'))
  const listQuery = useContractList({ status, page })

  // Đổi bộ lọc thì về trang 1, vì số trang của trạng thái mới khác.
  const setStatus = (nextStatus: ContractStatus | undefined) => {
    setSearchParams(nextStatus ? { status: nextStatus } : {}, { replace: true })
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Hợp đồng" description="Các hợp đồng thuê phòng bạn đứng tên, mới lập xếp trước." />

      <Field className="md:max-w-xs">
        <FieldLabel htmlFor="statusFilter">Trạng thái</FieldLabel>
        <NativeSelect
          id="statusFilter"
          className="w-full"
          value={status ?? ''}
          onChange={(event) => setStatus(parseStatus(event.target.value))}
        >
          <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
          {CONTRACT_STATUSES.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {getStatusDisplay('contract', value).label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      {listQuery.isPending ? (
        <ContractListSkeleton />
      ) : listQuery.isError ? (
        <ApiErrorAlert error={listQuery.error} onRetry={() => void listQuery.refetch()} />
      ) : listQuery.data.items.length === 0 ? (
        <ContractListEmpty
          status={status}
          isPastLastPage={page > 1 && listQuery.data.totalItems > 0}
          onClearStatus={() => setStatus(undefined)}
        />
      ) : (
        <>
          <ContractCards contracts={listQuery.data.items} />
          <ContractTable contracts={listQuery.data.items} />
          <ContractPagination
            page={listQuery.data.page}
            totalPages={listQuery.data.totalPages}
            searchParams={searchParams}
          />
        </>
      )}
    </section>
  )
}

// Giá trị lạ trên URL (gõ tay, đường dẫn cũ) thì coi như không lọc, không gửi lên server để nhận `400`.
function parseStatus(value: string | null): ContractStatus | undefined {
  return CONTRACT_STATUSES.find((status) => status === value)
}

function parsePage(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 1 ? page : 1
}

function contractPath(id: number) {
  return `/tenant/contracts/${id}`
}

function ContractTerm({ contract }: { contract: ContractListItem }) {
  return (
    <span>
      {formatDate(contract.startDate)} – {formatDate(contract.endDate)}
    </span>
  )
}

/** Hạn giữ chỗ chỉ có khi hợp đồng chưa hiệu lực; trạng thái khác không có. */
function ContractHoldDeadline({ contract }: { contract: ContractListItem }) {
  if (!contract.holdExpiresAt) {
    return null
  }
  return (
    <span>
      Giữ chỗ: <CountdownText expiresAt={contract.holdExpiresAt} />
    </span>
  )
}

/** Dưới `md`: mỗi hợp đồng một thẻ, bấm cả thẻ để mở chi tiết (docs/design-system.md mục 5). */
function ContractCards({ contracts }: { contracts: ContractListItem[] }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {contracts.map((contract) => (
        <li key={contract.id}>
          <Link
            to={contractPath(contract.id)}
            className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium wrap-anywhere">Phòng {contract.room.code}</span>
              <StatusBadge kind="contract" status={contract.status} />
            </div>
            <p className="text-sm text-muted-foreground wrap-anywhere">{contract.room.propertyName}</p>
            <p className="text-sm">
              <MoneyText amount={contract.rentPrice} /> / tháng · <ContractTerm contract={contract} />
            </p>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="wrap-anywhere">Chủ trọ: {contract.landlordName}</span>
              <ContractHoldDeadline contract={contract} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Từ `md`: bảng; mã phòng là liên kết tới chi tiết. */
function ContractTable({ contracts }: { contracts: ContractListItem[] }) {
  return (
    <div className="hidden rounded-xl border bg-card shadow-sm md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">Phòng</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Chủ trọ</TableHead>
            <TableHead>Thời hạn</TableHead>
            <TableHead className="text-right">Giá thuê / tháng</TableHead>
            <TableHead className="px-4">Hạn</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => (
            <TableRow key={contract.id}>
              <TableCell className="px-4 py-3 whitespace-normal">
                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    to={contractPath(contract.id)}
                    className="font-medium wrap-anywhere underline-offset-4 hover:underline"
                  >
                    Phòng {contract.room.code}
                  </Link>
                  <span className="text-muted-foreground wrap-anywhere">{contract.room.propertyName}</span>
                </div>
              </TableCell>
              <TableCell className="py-3">
                <StatusBadge kind="contract" status={contract.status} />
              </TableCell>
              <TableCell className="py-3 whitespace-normal wrap-anywhere">{contract.landlordName}</TableCell>
              <TableCell className="py-3">
                <ContractTerm contract={contract} />
              </TableCell>
              <TableCell className="py-3 text-right">
                <MoneyText amount={contract.rentPrice} />
              </TableCell>
              <TableCell className="px-4 py-3 whitespace-normal">
                <ContractHoldDeadline contract={contract} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface ContractPaginationProps {
  page: number
  totalPages: number
  searchParams: URLSearchParams
}

/** Chỉ hiện khi có từ 2 trang; giữ nguyên bộ lọc trạng thái khi chuyển trang. */
function ContractPagination({ page, totalPages, searchParams }: ContractPaginationProps) {
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

interface ContractListEmptyProps {
  status: ContractStatus | undefined
  /** Trang trên URL vượt quá số trang hiện có (hợp đồng vừa đổi trạng thái, đường dẫn cũ). */
  isPastLastPage: boolean
  onClearStatus: () => void
}

function ContractListEmpty({ status, isPastLastPage, onClearStatus }: ContractListEmptyProps) {
  if (isPastLastPage) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Trang này không còn hợp đồng nào</EmptyTitle>
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
            Không có hợp đồng nào ở trạng thái {getStatusDisplay('contract', status).label.toLowerCase()}
          </EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" variant="outline" onClick={onClearStatus}>
            Xem tất cả hợp đồng
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
        <EmptyTitle>Chưa có hợp đồng nào</EmptyTitle>
        <EmptyDescription>Chủ trọ lập hợp đồng sau khi duyệt yêu cầu thuê của bạn.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline">
          <Link to="/tenant/rental-requests">Xem yêu cầu thuê</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function ContractListSkeleton() {
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
