import { Wrench } from 'lucide-react'
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
import { usePropertyList } from '@/hooks/usePropertyList'
import {
  MAINTENANCE_REQUEST_SORTS,
  MAINTENANCE_REQUEST_STATUSES,
  MAINTENANCE_URGENCIES,
  type MaintenanceRequestListParams,
} from '@/types/maintenanceRequestTypes'
import { getMaintenanceUrgencyLabel } from '@/utils/maintenanceUrgencyLabels'
import { getStatusDisplay } from '@/utils/statusLabels'

type MaintenanceRequestFilters = Omit<MaintenanceRequestListParams, 'page'>

/**
 * L11 — Sự cố trên các khu trọ của Chủ trọ (docs/frontend-screens.md mục 6): lọc theo trạng thái,
 * khu trọ, mức khẩn cấp; mới gửi trước hoặc khẩn cấp trước. Bộ lọc và trang nằm trên query của URL
 * (`?status=Moi&sortBy=urgency&page=2`) để quay lại từ trang chi tiết vẫn giữ chỗ đang xem.
 */
export default function LandlordMaintenanceRequestListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { page, ...filters } = parseListParams(searchParams)
  const listQuery = useMaintenanceRequestList({ ...filters, page })
  // Gồm cả khu đã lưu trữ: sự cố cũ của khu đó vẫn cần tra.
  const propertiesQuery = usePropertyList(true)
  const hasFilter = filters.status !== undefined || filters.propertyId !== undefined || filters.urgency !== undefined

  // Đổi bộ lọc hay cách xếp thì về trang 1, vì danh sách của trang cũ không còn đúng.
  const setFilters = (next: MaintenanceRequestFilters) => {
    setSearchParams(toListSearch(next), { replace: true })
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Sự cố"
        description="Sự cố người thuê báo trên các khu trọ của bạn. Xếp khẩn cấp trước để biết việc nào cần làm ngay."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Field>
          <FieldLabel htmlFor="maintenanceStatusFilter">Trạng thái</FieldLabel>
          <NativeSelect
            id="maintenanceStatusFilter"
            className="w-full"
            value={filters.status ?? ''}
            onChange={(event) =>
              setFilters({ ...filters, status: MAINTENANCE_REQUEST_STATUSES.find((value) => value === event.target.value) })
            }
          >
            <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
            {MAINTENANCE_REQUEST_STATUSES.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {getStatusDisplay('maintenanceRequest', value).label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="maintenancePropertyFilter">Khu trọ</FieldLabel>
          <NativeSelect
            id="maintenancePropertyFilter"
            className="w-full"
            value={filters.propertyId ?? ''}
            disabled={propertiesQuery.isPending}
            onChange={(event) =>
              setFilters({ ...filters, propertyId: event.target.value ? Number(event.target.value) : undefined })
            }
          >
            <NativeSelectOption value="">Tất cả khu trọ</NativeSelectOption>
            {propertiesQuery.data?.map((property) => (
              <NativeSelectOption key={property.id} value={property.id}>
                {property.status === 'LuuTru' ? `${property.name} (đã lưu trữ)` : property.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="maintenanceUrgencyFilter">Mức khẩn cấp</FieldLabel>
          <NativeSelect
            id="maintenanceUrgencyFilter"
            className="w-full"
            value={filters.urgency ?? ''}
            onChange={(event) =>
              setFilters({ ...filters, urgency: MAINTENANCE_URGENCIES.find((value) => value === event.target.value) })
            }
          >
            <NativeSelectOption value="">Mọi mức</NativeSelectOption>
            {MAINTENANCE_URGENCIES.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {getMaintenanceUrgencyLabel(value)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="maintenanceSort">Sắp xếp</FieldLabel>
          <NativeSelect
            id="maintenanceSort"
            className="w-full"
            value={filters.sortBy ?? 'createdAt'}
            onChange={(event) =>
              setFilters({ ...filters, sortBy: MAINTENANCE_REQUEST_SORTS.find((value) => value === event.target.value) })
            }
          >
            <NativeSelectOption value="createdAt">Mới gửi trước</NativeSelectOption>
            <NativeSelectOption value="urgency">Khẩn cấp trước</NativeSelectOption>
          </NativeSelect>
        </Field>
      </div>

      {listQuery.isPending ? (
        <MaintenanceRequestListSkeleton />
      ) : listQuery.isLoadingError ? (
        <ApiErrorAlert error={listQuery.error} onRetry={() => void listQuery.refetch()} />
      ) : (
        <>
          {/* Lần tải lại lỗi (quay lại tab, đổi bộ lọc) thì giữ danh sách cũ, chỉ báo lỗi kèm nút thử lại. */}
          {listQuery.isRefetchError && (
            <ApiErrorAlert error={listQuery.error} onRetry={() => void listQuery.refetch()} />
          )}
          {listQuery.data.items.length === 0 ? (
            <MaintenanceRequestListEmpty
              hasFilter={hasFilter}
              isPastLastPage={page > 1 && listQuery.data.totalItems > 0}
              firstPageSearch={toListSearch(filters)}
              onClearFilters={() => setFilters({ sortBy: filters.sortBy })}
            />
          ) : (
            <>
              <MaintenanceRequestListView
                maintenanceRequests={listQuery.data.items}
                basePath="/landlord/maintenance-requests"
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
function parseListParams(searchParams: URLSearchParams): MaintenanceRequestListParams & { page: number } {
  const propertyId = Number(searchParams.get('propertyId'))
  const page = Number(searchParams.get('page'))
  return {
    status: MAINTENANCE_REQUEST_STATUSES.find((value) => value === searchParams.get('status')),
    propertyId: Number.isInteger(propertyId) && propertyId > 0 ? propertyId : undefined,
    urgency: MAINTENANCE_URGENCIES.find((value) => value === searchParams.get('urgency')),
    // Mặc định của server là mới gửi trước, nên không ghi `createdAt` lên URL.
    sortBy: searchParams.get('sortBy') === 'urgency' ? 'urgency' : undefined,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  }
}

function toListSearch(filters: MaintenanceRequestFilters): string {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.propertyId !== undefined) params.set('propertyId', String(filters.propertyId))
  if (filters.urgency) params.set('urgency', filters.urgency)
  if (filters.sortBy === 'urgency') params.set('sortBy', 'urgency')
  return params.toString()
}

interface MaintenanceRequestListEmptyProps {
  hasFilter: boolean
  /** Trang trên URL vượt quá số trang hiện có (sự cố vừa đổi trạng thái, đường dẫn cũ). */
  isPastLastPage: boolean
  firstPageSearch: string
  onClearFilters: () => void
}

function MaintenanceRequestListEmpty({
  hasFilter,
  isPastLastPage,
  firstPageSearch,
  onClearFilters,
}: MaintenanceRequestListEmptyProps) {
  if (isPastLastPage) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Trang này không còn sự cố nào</EmptyTitle>
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
            <Wrench />
          </EmptyMedia>
          <EmptyTitle>Không có sự cố nào khớp bộ lọc</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" variant="outline" onClick={onClearFilters}>
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
        <EmptyTitle>Chưa có sự cố nào</EmptyTitle>
        <EmptyDescription>
          Người thuê báo hỏng hóc trong phòng thì sự cố hiện ở đây, kèm thông báo cho bạn.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
