import { Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import PageHeader from '@/components/PageHeader'
import PropertyCard from '@/components/PropertyCard'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import EmptyIllustration from '@/components/EmptyIllustration'
import { Field, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { usePropertyList } from '@/hooks/usePropertyList'
import type { PropertyListItem } from '@/types/propertyTypes'

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
      ) : propertiesQuery.isLoadingError ? (
        <ApiErrorAlert error={propertiesQuery.error} onRetry={() => void propertiesQuery.refetch()} />
      ) : (
        <>
          {/* Lần tải lại lỗi (quay lại tab, tải lại sau khi lưu trữ) thì giữ danh sách cũ, chỉ báo lỗi kèm nút thử lại. */}
          {propertiesQuery.isRefetchError && (
            <ApiErrorAlert error={propertiesQuery.error} onRetry={() => void propertiesQuery.refetch()} />
          )}
          {propertiesQuery.data.length === 0 ? (
            <PropertyListEmpty includeArchived={includeArchived} />
          ) : (
            <PropertyGrid properties={propertiesQuery.data} />
          )}
        </>
      )}
    </section>
  )
}

/**
 * Lưới thẻ khu trọ có ảnh ở mọi cỡ màn (docs/frontend-screens.md mục 6, L2; docs/design-system.md mục 11):
 * 1 cột dưới `md`, 2 cột từ `md`, 3 cột từ `xl`. Khu đã lưu trữ có ảnh mờ và nhãn Lưu trữ (`PropertyCard`).
 */
function PropertyGrid({ properties }: { properties: PropertyListItem[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {properties.map((property) => (
        <li key={property.id}>
          <PropertyCard property={property} />
        </li>
      ))}
    </ul>
  )
}

function PropertyListEmpty({ includeArchived }: { includeArchived: boolean }) {
  return (
    <Empty className="border bg-card">
      <EmptyHeader>
        <EmptyIllustration kind="house" />
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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Đang tải khu trọ">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex flex-col overflow-hidden rounded-xl border bg-card">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-1.5 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
