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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useInvoiceList } from '@/hooks/useInvoiceList'
import { INVOICE_STATUSES, type InvoiceListParams, type InvoiceType } from '@/types/invoiceTypes'
import { getInvoiceTypeLabel } from '@/utils/invoiceTypeLabels'
import { parseInvoiceListParams, toInvoiceListSearch } from '@/utils/invoiceListParams'
import { getStatusDisplay } from '@/utils/statusLabels'

const INVOICE_TYPES: InvoiceType[] = ['DinhKy', 'ThanhLy']

/**
 * T5 — Hóa đơn của các hợp đồng Người thuê đứng tên (docs/frontend-screens.md mục 5): kỳ mới trước, lọc theo
 * loại và trạng thái, phân trang. Bộ lọc đọc từ query của URL vì mục "Bảng thanh lý chờ bạn đồng ý" ở T1 dẫn tới
 * `?type=ThanhLy&status=ChoNguoiThueXacNhan`, và quay lại từ chi tiết vẫn giữ chỗ đang xem.
 */
export default function TenantInvoiceListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = parseInvoiceListParams(searchParams, 'tenant')
  const { page, ...filters } = params
  const listQuery = useInvoiceList(params)
  const hasFilter = filters.status !== undefined || filters.type !== undefined || filters.month !== undefined

  // Đổi bộ lọc thì về trang 1, vì số trang của bộ lọc mới khác.
  const setFilters = (next: Omit<InvoiceListParams, 'page'>) => {
    setSearchParams(toInvoiceListSearch(next), { replace: true })
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title="Hóa đơn" description="Hóa đơn của các hợp đồng bạn đứng tên, kỳ mới xếp trước." />

      <div className="grid gap-4 md:max-w-2xl md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="invoiceTypeFilter">Loại hóa đơn</FieldLabel>
          <NativeSelect
            id="invoiceTypeFilter"
            className="w-full"
            value={filters.type ?? ''}
            onChange={(event) =>
              setFilters({ ...filters, type: INVOICE_TYPES.find((type) => type === event.target.value) })
            }
          >
            <NativeSelectOption value="">Tất cả loại</NativeSelectOption>
            {INVOICE_TYPES.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {getInvoiceTypeLabel(value)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

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
              emptyDescription="Chủ trọ phát hành hóa đơn hằng tháng khi hợp đồng có hiệu lực; bạn nhận thông báo mỗi khi có hóa đơn mới."
              emptyAction={
                <Button asChild variant="outline">
                  <Link to="/tenant/contracts">Xem hợp đồng</Link>
                </Button>
              }
            />
          ) : (
            <>
              <InvoiceListView
                invoices={listQuery.data.items}
                basePath="/tenant/invoices"
                listSearch={searchParams.toString()}
                showTenant={false}
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
