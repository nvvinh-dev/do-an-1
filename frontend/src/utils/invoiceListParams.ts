import { INVOICE_STATUSES, type InvoiceListParams, type InvoiceStatus, type InvoiceType } from '@/types/invoiceTypes'

const INVOICE_TYPES: readonly InvoiceType[] = ['DinhKy', 'ThanhLy']

function parseStatus(value: string | null): InvoiceStatus | undefined {
  return INVOICE_STATUSES.find((status) => status === value)
}

function parseType(value: string | null): InvoiceType | undefined {
  return INVOICE_TYPES.find((type) => type === value)
}

/** Tháng `YYYY-MM` như `<input type="month">` trả về và API nhận (`month` của `GET /invoices`). */
function parseMonth(value: string | null): string | undefined {
  return value !== null && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : undefined
}

function parsePositiveInteger(value: string | null): number | undefined {
  const number = Number(value)
  return value !== null && Number.isInteger(number) && number > 0 ? number : undefined
}

/**
 * Bộ lọc và trang của L8, T5 nằm trên query của URL để lối tắt ở L1 (`?status=ChoXacNhan`), T1
 * (`?type=ThanhLy&status=ChoNguoiThueXacNhan`) dẫn thẳng tới đúng danh sách, và quay lại từ chi tiết giữ chỗ đang
 * xem. Giá trị lạ (gõ tay, đường dẫn cũ) thì coi như không lọc, không gửi lên server để nhận `400`. Lọc theo khu
 * trọ chỉ có ở L8.
 */
export function parseInvoiceListParams(
  searchParams: URLSearchParams,
  role: 'landlord' | 'tenant',
): InvoiceListParams & { page: number } {
  const params: InvoiceListParams & { page: number } = {
    status: parseStatus(searchParams.get('status')),
    month: parseMonth(searchParams.get('month')),
    type: parseType(searchParams.get('type')),
    page: Math.max(parsePositiveInteger(searchParams.get('page')) ?? 1, 1),
  }
  if (role === 'landlord') {
    params.propertyId = parsePositiveInteger(searchParams.get('propertyId'))
  }
  return params
}

/** Query của bộ lọc mới, bỏ khóa trống và về trang 1 (số trang của bộ lọc mới khác). */
export function toInvoiceListSearch(filters: Omit<InvoiceListParams, 'page'>): Record<string, string> {
  const search: Record<string, string> = {}
  if (filters.status) search.status = filters.status
  if (filters.type) search.type = filters.type
  if (filters.month) search.month = filters.month
  if (filters.propertyId !== undefined) search.propertyId = String(filters.propertyId)
  return search
}
