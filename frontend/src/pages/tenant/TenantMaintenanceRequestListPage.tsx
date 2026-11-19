import { Plus, Wrench } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import MaintenanceRequestListView, {
  MaintenanceRequestListSkeleton,
  MaintenanceRequestPagination,
} from '@/components/MaintenanceRequestListView'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useMaintenanceRequestList } from '@/hooks/useMaintenanceRequestList'
import { MAINTENANCE_REQUEST_STATUSES, type MaintenanceRequestStatus } from '@/types/maintenanceRequestTypes'
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
              <MaintenanceRequestListView
                maintenanceRequests={listQuery.data.items}
                basePath="/tenant/maintenance-requests"
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
