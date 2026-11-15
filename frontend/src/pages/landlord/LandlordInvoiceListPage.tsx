import { Link, useSearchParams } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import InvoiceListView, {
  InvoiceListEmpty,
  InvoiceListSkeleton,
  InvoicePagination,
} from '@/components/InvoiceListView'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useInvoiceList } from '@/hooks/useInvoiceList'
import { usePropertyList } from '@/hooks/usePropertyList'
import { INVOICE_STATUSES, type InvoiceListParams } from '@/types/invoiceTypes'
import { parseInvoiceListParams, toInvoiceListSearch } from '@/utils/invoiceListParams'
import { getStatusDisplay } from '@/utils/statusLabels'

/**
 * L8 — Hóa đơn của các hợp đồng trên khu trọ của Chủ trọ (docs/frontend-screens.md mục 6): kỳ mới trước, lọc
 * theo trạng thái, tháng, khu trọ, phân trang. Bộ lọc nằm trên query của URL để mục "Báo thanh toán chờ xác nhận"
 * ở L1 dẫn thẳng tới `?status=ChoXacNhan`, và quay lại từ chi tiết vẫn giữ chỗ đang xem.
 */
export default function LandlordInvoiceListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = parseInvoiceListParams(searchParams, 'landlord')
  const { page, ...filters } = params
  const listQuery = useInvoiceList(params)
  // Gồm cả khu đã lưu trữ: hóa đơn cũ của khu đó vẫn cần tra.
  const propertiesQuery = usePropertyList(true)
  const hasFilter = filters.status !== undefined || filters.month !== undefined || filters.propertyId !== undefined

  // Đổi bộ lọc thì về trang 1, vì số trang của bộ lọc mới khác.
  const setFilters = (next: Omit<InvoiceListParams, 'page'>) => {
    setSearchParams(toInvoiceListSearch(next), { replace: true })
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="Hóa đơn"
        description="Hóa đơn của các hợp đồng trên khu trọ của bạn, kỳ mới xếp trước. Lập hóa đơn mới ở trang chi tiết hợp đồng."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Field>
          <FieldLabel htmlFor="invoiceStatusFilter">Trạng thái</FieldLabel>
          <NativeSelect
            id="invoiceStatusFilter"
            className="w-full"
            value={filters.status ?? ''}
            onChange={(event) =>
              setFilters({ ...filters, status: INVOICE_STATUSES.find((status) => status === event.target.value) })
            }
          >
            <NativeSelectOption value="">Tất cả trạng thái</NativeSelectOption>
            {INVOICE_STATUSES.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {getStatusDisplay('invoice', value).label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="invoiceMonthFilter">Tháng của kỳ</FieldLabel>
          <Input
            id="invoiceMonthFilter"
            type="month"
            value={filters.month ?? ''}
            onChange={(event) => setFilters({ ...filters, month: event.target.value || undefined })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="invoicePropertyFilter">Khu trọ</FieldLabel>
          <NativeSelect
            id="invoicePropertyFilter"
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
      </div>

      {listQuery.isPending ? (
        <InvoiceListSkeleton />
      ) : listQuery.isLoadingError ? (
        <ApiErrorAlert error={listQuery.error} onRetry={() => void listQuery.refetch()} />
      ) : (
        <>
          {/* Lần tải lại lỗi (quay lại tab, đổi bộ lọc) thì giữ danh sách cũ, chỉ báo lỗi kèm nút thử lại. */}
          {listQuery.isRefetchError && (
            <ApiErrorAlert error={listQuery.error} onRetry={() => void listQuery.refetch()} />
          )}
          {listQuery.data.items.length === 0 ? (
            <InvoiceListEmpty
              hasFilter={hasFilter}
              isPastLastPage={page > 1 && listQuery.data.totalItems > 0}
              firstPageSearch={new URLSearchParams(toInvoiceListSearch(filters)).toString()}
              onClearFilters={() => setFilters({})}
              emptyDescription="Mở một hợp đồng đang hiệu lực và bấm Lập hóa đơn kỳ tiếp để chốt chỉ số, lập hóa đơn đầu tiên."
              emptyAction={
                <Button asChild variant="outline">
                  <Link to="/landlord/contracts?status=DangHieuLuc">Xem hợp đồng đang hiệu lực</Link>
                </Button>
              }
            />
          ) : (
            <>
              <InvoiceListView
                invoices={listQuery.data.items}
                basePath="/landlord/invoices"
                listSearch={searchParams.toString()}
                showTenant
              />
              <InvoicePagination
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
