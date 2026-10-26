import { Building2, Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import PageHeader from '@/components/PageHeader'
import RoomCountsSummary from '@/components/RoomCountsSummary'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePropertyList } from '@/hooks/usePropertyList'
import type { PropertyListItem } from '@/types/propertyTypes'
import { formatPropertyAddress } from '@/utils/formatPropertyAddress'

const NEW_PROPERTY_PATH = '/landlord/properties/new'

/**
 * L2 — Danh sách khu trọ của Chủ trọ (docs/frontend-screens.md mục 6). Mặc định ẩn khu đã lưu
 * trữ; ô "Hiện cả khu đã lưu trữ" ghi vào URL (`?includeArchived=true`) để quay lại trang vẫn giữ
 * lựa chọn. Danh sách không phân trang (docs/api-design.md mục 5.1).
 */
export default function PropertyListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const includeArchived = searchParams.get('includeArchived') === 'true'
  const propertiesQuery = usePropertyList(includeArchived)

  const setIncludeArchived = (checked: boolean) => {
    setSearchParams(checked ? { includeArchived: 'true' } : {}, { replace: true })
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Khu trọ"
        description="Các khu trọ bạn quản lý và số phòng theo trạng thái."
        action={
          <Button asChild size="page">
            <Link to={NEW_PROPERTY_PATH}>
              <Plus />
              Thêm khu trọ
            </Link>
          </Button>
        }
      />

      <Field orientation="horizontal" className="w-auto">
        <Checkbox
          id="includeArchived"
          checked={includeArchived}
          onCheckedChange={(checked) => setIncludeArchived(checked === true)}
        />
        <FieldLabel htmlFor="includeArchived" className="font-normal">
          Hiện cả khu đã lưu trữ
        </FieldLabel>
      </Field>

      {propertiesQuery.isPending ? (
        <PropertyListSkeleton />
      ) : propertiesQuery.isError ? (
        <ApiErrorAlert error={propertiesQuery.error} onRetry={() => void propertiesQuery.refetch()} />
      ) : propertiesQuery.data.length === 0 ? (
        <PropertyListEmpty includeArchived={includeArchived} />
      ) : (
        <>
          <PropertyCards properties={propertiesQuery.data} />
          <PropertyTable properties={propertiesQuery.data} />
        </>
      )}
    </section>
  )
}

function propertyPath(id: number) {
  return `/landlord/properties/${id}`
}

/** Dưới `md`: mỗi khu trọ một thẻ, bấm cả thẻ để mở chi tiết (docs/design-system.md mục 5). */
function PropertyCards({ properties }: { properties: PropertyListItem[] }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden">
      {properties.map((property) => (
        <li key={property.id}>
          <Link
            to={propertyPath(property.id)}
            className="flex gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <CoverImage property={property} />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium wrap-anywhere">{property.name}</span>
                <StatusBadge kind="property" status={property.status} />
              </div>
              <p className="text-sm text-muted-foreground wrap-anywhere">{formatPropertyAddress(property)}</p>
              <RoomCountsSummary counts={property.roomCounts} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Từ `md`: bảng; tên khu trọ là liên kết tới chi tiết. */
function PropertyTable({ properties }: { properties: PropertyListItem[] }) {
  return (
    <div className="hidden rounded-xl border bg-card shadow-sm md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">Khu trọ</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="px-4">Phòng</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {properties.map((property) => (
            <TableRow key={property.id}>
              <TableCell className="px-4 py-3 whitespace-normal">
                <div className="flex items-center gap-3">
                  <CoverImage property={property} />
                  <div className="flex min-w-0 flex-col gap-1">
                    <Link
                      to={propertyPath(property.id)}
                      className="font-medium wrap-anywhere underline-offset-4 hover:underline"
                    >
                      {property.name}
                    </Link>
                    <span className="text-muted-foreground wrap-anywhere">{formatPropertyAddress(property)}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-3">
                <StatusBadge kind="property" status={property.status} />
              </TableCell>
              <TableCell className="px-4 py-3 whitespace-normal">
                <RoomCountsSummary counts={property.roomCounts} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function CoverImage({ property }: { property: PropertyListItem }) {
  if (property.coverImageUrl === null) {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Building2 className="size-5" aria-hidden="true" />
      </div>
    )
  }

  return (
    <img
      src={property.coverImageUrl}
      alt={`Ảnh đại diện khu trọ ${property.name}`}
      className="size-14 shrink-0 rounded-lg object-cover"
      loading="lazy"
    />
  )
}

function PropertyListEmpty({ includeArchived }: { includeArchived: boolean }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Building2 />
        </EmptyMedia>
        <EmptyTitle>{includeArchived ? 'Chưa có khu trọ nào' : 'Chưa có khu trọ nào đang khai thác'}</EmptyTitle>
        <EmptyDescription>Thêm khu trọ để bắt đầu khai báo phòng và đăng tin.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to={NEW_PROPERTY_PATH}>
            <Plus />
            Thêm khu trọ
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function PropertyListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex gap-3 rounded-xl border bg-card p-4">
          <Skeleton className="size-14 shrink-0 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
