import { isAxiosError } from 'axios'
import { CircleAlert, ImageOff, SearchX, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import MoneyText from '@/components/MoneyText'
import PageHeader from '@/components/PageHeader'
import RoomSearchFilterForm from '@/components/RoomSearchFilterForm'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
import { useAmenities } from '@/hooks/useAmenities'
import { useLocations } from '@/hooks/useLocations'
import { useRoomSearch } from '@/hooks/useRoomSearch'
import { cn } from '@/lib/utils'
import type { RoomSearchItem, RoomSearchParams } from '@/types/roomSearchTypes'
import {
  countActiveRoomSearchFilters,
  getRoomSearchErrorMessages,
  parseRoomSearchParams,
  toRoomSearchQuery,
} from '@/utils/roomSearchParams'

/** Cách sắp xếp trong ô chọn; khóa rỗng là phòng mới thêm trước (mặc định của API). */
const SORT_OPTIONS = [
  { key: '', label: 'Mới đăng', sortBy: undefined, sortDirection: undefined },
  { key: 'price-asc', label: 'Giá thấp đến cao', sortBy: 'price', sortDirection: 'asc' },
  { key: 'price-desc', label: 'Giá cao đến thấp', sortBy: 'price', sortDirection: 'desc' },
  { key: 'area-asc', label: 'Diện tích nhỏ đến lớn', sortBy: 'area', sortDirection: 'asc' },
  { key: 'area-desc', label: 'Diện tích lớn đến nhỏ', sortBy: 'area', sortDirection: 'desc' },
] as const satisfies readonly {
  key: string
  label: string
  sortBy: RoomSearchParams['sortBy']
  sortDirection: RoomSearchParams['sortDirection']
}[]

/**
 * P1 — Tìm phòng, trang chủ (docs/frontend-screens.md mục 2). Bộ lọc, sắp xếp và trang nằm trên query
 * của URL, trùng tên tham số của `GET /rooms/search`: tải lại, quay lại hay chia sẻ đường dẫn vẫn
 * giữ đúng kết quả. Dưới `lg` bộ lọc gập lại sau nút "Bộ lọc" để kết quả lên đầu.
 */
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = parseRoomSearchParams(searchParams)
  const searchQuery = useRoomSearch(params)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const activeFilterCount = countActiveRoomSearchFilters(params)

  const applyParams = (next: RoomSearchParams) => setSearchParams(toRoomSearchQuery(next))
  const clearFilters = () =>
    applyParams({ amenityIds: [], sortBy: params.sortBy, sortDirection: params.sortDirection, page: 1 })

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Tìm phòng trọ" description="Lọc theo khu vực, giá, diện tích và tiện ích bạn cần." />

      {/* Dưới `lg` xếp một cột: thanh công cụ (có nút "Bộ lọc") → bộ lọc khi mở → kết quả. Từ `lg` bộ lọc
          là cột trái chiếm cả hai hàng, thanh công cụ và kết quả ở cột phải. */}
      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-6">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between lg:col-start-2 lg:row-start-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
              {searchQuery.data ? `Tìm thấy ${searchQuery.data.totalItems} phòng` : ' '}
            </p>
            <Button
              type="button"
              variant="outline"
              className="lg:hidden"
              aria-expanded={filtersOpen}
              aria-controls="room-search-filters"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <SlidersHorizontal />
              Bộ lọc{activeFilterCount > 0 && ` (${activeFilterCount})`}
            </Button>
          </div>
          <Field className="sm:w-56">
            <FieldLabel htmlFor="search-sort">Sắp xếp</FieldLabel>
            <NativeSelect
              id="search-sort"
              className="w-full"
              value={getSortKey(params)}
              onChange={(event) => {
                const option = SORT_OPTIONS.find((item) => item.key === event.target.value) ?? SORT_OPTIONS[0]
                applyParams({ ...params, sortBy: option.sortBy, sortDirection: option.sortDirection, page: 1 })
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <NativeSelectOption key={option.key} value={option.key}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <aside
          id="room-search-filters"
          className={cn(!filtersOpen && 'hidden', 'lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:block')}
        >
          {/* Dựng lại form khi URL đổi (quay lại, xóa bộ lọc) để ô nhập khớp bộ lọc đang áp dụng. */}
          <FilterPanel
            key={searchParams.toString()}
            params={params}
            onApply={(next) => {
              applyParams(next)
              setFiltersOpen(false)
            }}
            onClear={() => {
              clearFilters()
              setFiltersOpen(false)
            }}
          />
        </aside>

        <div className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-2">
          {searchQuery.isPending ? (
            <SearchResultsSkeleton />
          ) : searchQuery.isLoadingError ? (
            <SearchError error={searchQuery.error} onRetry={() => void searchQuery.refetch()} onClear={clearFilters} />
          ) : (
            <>
              {/* Lần tải lỗi sau khi đã có kết quả (đổi bộ lọc, sang trang) thì giữ kết quả cũ, báo lỗi ở trên. */}
              {searchQuery.isRefetchError && (
                <SearchError error={searchQuery.error} onRetry={() => void searchQuery.refetch()} onClear={clearFilters} />
              )}
              {searchQuery.data.items.length === 0 ? (
                <SearchEmpty
                  hasFilters={activeFilterCount > 0}
                  isPastLastPage={params.page > 1 && searchQuery.data.totalItems > 0}
                  firstPageSearch={toRoomSearchQuery({ ...params, page: 1 }).toString()}
                  onClear={clearFilters}
                />
              ) : (
                <div
                  className={cn('flex flex-col gap-6 transition-opacity', searchQuery.isPlaceholderData && 'opacity-60')}
                  aria-busy={searchQuery.isPlaceholderData}
                >
                  <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {searchQuery.data.items.map((room) => (
                      <li key={room.id}>
                        <RoomCard room={room} listSearch={searchParams.toString()} />
                      </li>
                    ))}
                  </ul>
                  <SearchPagination page={searchQuery.data.page} totalPages={searchQuery.data.totalPages} params={params} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}

/** Có `sortBy` mà thiếu chiều thì API xếp tăng dần, nên ô chọn hiện cách "tăng dần" tương ứng. */
function getSortKey({ sortBy, sortDirection }: RoomSearchParams): string {
  if (!sortBy) return ''
  return `${sortBy}-${sortDirection ?? 'asc'}`
}

interface FilterPanelProps {
  params: RoomSearchParams
  onApply: (params: RoomSearchParams) => void
  onClear: () => void
}

/** Form bộ lọc cần danh mục tỉnh/thành và tiện ích; tải xong mới dựng form để giá trị ban đầu đủ. */
function FilterPanel({ params, onApply, onClear }: FilterPanelProps) {
  const locationsQuery = useLocations()
  const amenitiesQuery = useAmenities()

  if (locationsQuery.isError || amenitiesQuery.isError) {
    return (
      <ApiErrorAlert
        error={locationsQuery.error ?? amenitiesQuery.error}
        onRetry={() => {
          if (locationsQuery.isError) void locationsQuery.refetch()
          if (amenitiesQuery.isError) void amenitiesQuery.refetch()
        }}
      />
    )
  }

  if (locationsQuery.isPending || amenitiesQuery.isPending) {
    return (
      <div className="flex flex-col gap-5 rounded-xl border bg-card p-4" aria-busy="true">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <RoomSearchFilterForm
      params={params}
      locations={locationsQuery.data}
      amenities={amenitiesQuery.data}
      onApply={onApply}
      onClear={onClear}
    />
  )
}

/**
 * Cả thẻ bấm được để mở chi tiết phòng (P2). `listSearch` là query bộ lọc và trang đang xem, gửi kèm
 * qua `state` để nút quay lại ở P2 về đúng kết quả này.
 */
function RoomCard({ room, listSearch }: { room: RoomSearchItem; listSearch: string }) {
  const shownAmenities = room.amenities.slice(0, 3)
  const hiddenAmenityCount = room.amenities.length - shownAmenities.length

  return (
    <Link
      to={`/rooms/${room.id}`}
      state={{ listSearch }}
      className="flex h-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm outline-none transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {room.coverImageUrl ? (
        <img
          src={room.coverImageUrl}
          alt={`Ảnh phòng ${room.code}`}
          loading="lazy"
          className="aspect-[4/3] w-full bg-muted object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted text-muted-foreground">
          <ImageOff aria-hidden className="size-8" />
          <span className="sr-only">Phòng {room.code} chưa có ảnh</span>
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-lg font-semibold text-primary">
          <MoneyText amount={room.rentPrice} /> <span className="text-sm font-normal text-muted-foreground">/ tháng</span>
        </p>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="font-medium wrap-anywhere">
            Phòng {room.code} · {room.propertyName}
          </p>
          <p className="text-sm text-muted-foreground wrap-anywhere">
            {room.address}, {room.ward}, {room.city}
          </p>
        </div>
        <p className="text-sm tabular-nums">
          {room.area.toLocaleString('vi-VN')} m² · Tối đa {room.maxOccupants} người
        </p>
        {room.amenities.length > 0 && (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {shownAmenities.map((amenity) => (
              <li key={amenity}>
                <Badge variant="secondary">{amenity}</Badge>
              </li>
            ))}
            {hiddenAmenityCount > 0 && (
              <li>
                <Badge variant="outline">+{hiddenAmenityCount} tiện ích</Badge>
              </li>
            )}
          </ul>
        )}
      </div>
    </Link>
  )
}

interface SearchErrorProps {
  error: unknown
  onRetry: () => void
  onClear: () => void
}

/**
 * `400` là bộ lọc trên URL sai (gõ tay, đường dẫn hỏng; form đã kiểm tra trước nên không gửi được
 * bộ lọc sai): hiện câu tiếng Việt server ghi cho từng chỗ sai kèm nút xóa bộ lọc. Lỗi khác theo bảng
 * ở docs/frontend-screens.md mục 1.
 */
function SearchError({ error, onRetry, onClear }: SearchErrorProps) {
  if (!isAxiosError(error) || error.response?.status !== 400) {
    return <ApiErrorAlert error={error} onRetry={onRetry} />
  }

  const messages = getRoomSearchErrorMessages(error.response.data)
  return (
    <Alert variant="destructive" className="border-destructive/40">
      <CircleAlert />
      <AlertTitle>Bộ lọc trên đường dẫn chưa hợp lệ</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-2">
        {messages.length > 0 ? (
          <ul className="list-disc pl-4">
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : (
          <p>Vui lòng chọn lại bộ lọc.</p>
        )}
        <Button type="button" variant="outline" size="sm" onClick={onClear}>
          Xóa bộ lọc
        </Button>
      </AlertDescription>
    </Alert>
  )
}

interface SearchEmptyProps {
  hasFilters: boolean
  /** Trang trên URL vượt quá số trang hiện có (phòng vừa được thuê, đường dẫn cũ). */
  isPastLastPage: boolean
  firstPageSearch: string
  onClear: () => void
}

function SearchEmpty({ hasFilters, isPastLastPage, firstPageSearch, onClear }: SearchEmptyProps) {
  if (isPastLastPage) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Trang này không còn phòng nào</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link to={{ search: firstPageSearch }}>Về trang đầu</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchX />
        </EmptyMedia>
        <EmptyTitle>{hasFilters ? 'Không có phòng nào khớp bộ lọc' : 'Chưa có phòng nào đang cho thuê'}</EmptyTitle>
        {hasFilters && (
          <EmptyDescription>Thử nới khoảng giá, diện tích hoặc bỏ bớt tiện ích, khu vực.</EmptyDescription>
        )}
      </EmptyHeader>
      {hasFilters && (
        <EmptyContent>
          <Button type="button" variant="outline" onClick={onClear}>
            Xóa bộ lọc
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}

interface SearchPaginationProps {
  page: number
  totalPages: number
  params: RoomSearchParams
}

/** Chỉ hiện khi có từ 2 trang; giữ nguyên bộ lọc và sắp xếp khi chuyển trang. */
function SearchPagination({ page, totalPages, params }: SearchPaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const pageLink = (target: number) => ({ search: toRoomSearchQuery({ ...params, page: target }).toString() })

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

function SearchResultsSkeleton() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
      {Array.from({ length: 6 }, (_, index) => (
        <li key={index} className="overflow-hidden rounded-xl border bg-card">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </li>
      ))}
    </ul>
  )
}
