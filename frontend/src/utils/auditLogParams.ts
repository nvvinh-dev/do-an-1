import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  type AuditLogFilterFormValues,
  type AuditLogFilters,
  type AuditLogListParams,
} from '@/types/auditLogTypes'

// Số lớn nhất server đọc được cho `page`; số lớn hơn thì server trả `400` bằng câu tiếng Anh.
const MAX_INT = 2_147_483_647

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * Đọc bộ lọc của AD4 từ query của URL. Giá trị lạ (gõ tay, đường dẫn cũ) thì coi như không lọc, không
 * gửi lên server để nhận `400`. Khoảng ngày ngược thì bỏ `to`.
 */
export function parseAuditLogFilters(query: URLSearchParams): AuditLogFilters {
  const fromDate = parseDate(query.get('from'))
  const toDate = parseDate(query.get('to'))
  return {
    entityType: AUDIT_ENTITY_TYPES.find((value) => value === query.get('entityType')),
    entityId: parseId(query.get('entityId')),
    actorUserId: parseId(query.get('actorUserId')),
    action: AUDIT_ACTIONS.find((value) => value === query.get('action')),
    fromDate,
    toDate: isDateRangeValid(fromDate, toDate) ? toDate : undefined,
    page: parsePage(query.get('page')),
  }
}

/** Query của URL cho bộ lọc, theo thứ tự cố định; bỏ trường trống và trang 1. */
export function toAuditLogQuery(filters: AuditLogFilters): URLSearchParams {
  const query = new URLSearchParams()
  const set = (key: string, value: string | number | undefined) => {
    if (value !== undefined) query.set(key, String(value))
  }
  set('entityType', filters.entityType)
  set('entityId', filters.entityId)
  set('actorUserId', filters.actorUserId)
  set('action', filters.action)
  set('from', filters.fromDate)
  set('to', filters.toDate)
  if (filters.page > 1) set('page', filters.page)
  return query
}

/**
 * Tham số gọi API: ngày theo giờ Việt Nam đổi thành đầu ngày và cuối ngày, để "đến ngày" gồm trọn ngày
 * đó (`to` tính cả đầu mút). Số lẻ của giây viết đủ 7 chữ số, là độ chính xác của `DateTimeOffset`.
 */
export function toAuditLogListParams(filters: AuditLogFilters): AuditLogListParams {
  const { fromDate, toDate, ...rest } = filters
  return {
    ...rest,
    from: fromDate && `${fromDate}T00:00:00+07:00`,
    to: toDate && `${toDate}T23:59:59.9999999+07:00`,
  }
}

/** Số bộ lọc đang áp dụng (không tính trang), hiện trên nút mở bộ lọc ở điện thoại. */
export function countActiveAuditLogFilters(filters: AuditLogFilters): number {
  const fields = [
    filters.entityType,
    filters.entityId,
    filters.actorUserId,
    filters.action,
    filters.fromDate,
    filters.toDate,
  ]
  return fields.filter((value) => value !== undefined).length
}

export function toAuditLogFormValues(filters: AuditLogFilters): AuditLogFilterFormValues {
  return {
    entityType: filters.entityType ?? '',
    entityId: filters.entityId === undefined ? '' : String(filters.entityId),
    actorUserId: filters.actorUserId === undefined ? '' : String(filters.actorUserId),
    action: filters.action ?? '',
    fromDate: filters.fromDate ?? '',
    toDate: filters.toDate ?? '',
  }
}

/** Bộ lọc mới từ form đã qua kiểm tra; về trang 1 vì số trang của bộ lọc mới khác. */
export function fromAuditLogFormValues(values: AuditLogFilterFormValues): AuditLogFilters {
  return parseAuditLogFilters(
    new URLSearchParams({
      entityType: values.entityType,
      entityId: values.entityId.trim(),
      actorUserId: values.actorUserId.trim(),
      action: values.action,
      from: values.fromDate,
      to: values.toDate,
    }),
  )
}

/** Kiểm tra ô mã đối tượng, mã người thực hiện; ô trống là không lọc. */
export function validateAuditLogId(input: string): true | string {
  const value = input.trim()
  if (value === '') return true
  return parseId(value) === undefined ? 'Nhập mã là số nguyên dương.' : true
}

/** Hai chuỗi `YYYY-MM-DD` so sánh được trực tiếp; thiếu một đầu thì khoảng luôn hợp lệ. */
export function isDateRangeValid(fromDate: string | undefined, toDate: string | undefined): boolean {
  return !fromDate || !toDate || fromDate <= toDate
}

function parseId(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) {
    return undefined
  }
  // Mã lớn hơn số nguyên an toàn của JavaScript thì đổi sang chuỗi bị sai số và có thể vượt `long`.
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : undefined
}

function parseDate(value: string | null): string | undefined {
  if (value === null || !DATE_PATTERN.test(value)) {
    return undefined
  }
  // `Date` tự chuyển 31/02 sang tháng sau, nên ngày không có thật sẽ không khớp lại chuỗi ban đầu.
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) ? value : undefined
}

function parsePage(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 1 && page <= MAX_INT ? page : 1
}
