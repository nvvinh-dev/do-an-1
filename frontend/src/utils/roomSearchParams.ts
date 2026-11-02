import {
  ROOM_SEARCH_SORT_DIRECTIONS,
  ROOM_SEARCH_SORT_FIELDS,
  type RoomSearchFormValues,
  type RoomSearchParams,
} from '@/types/roomSearchTypes'
import { normalizeRoomArea, normalizeRoomMoney, toRoomAreaInput } from '@/utils/validateRoomInput'

// Giới hạn của cột trong database (validateRoomInput.ts). Số lớn hơn không lọc bớt phòng nào, còn gửi
// lên thì server không đọc được thành số và trả `400` bằng câu tiếng Anh.
const MAX_MONEY = 999_999_999_999
const MAX_AREA = 999_999.99
const MAX_INT = 2_147_483_647

/**
 * Đọc bộ lọc của P1 từ query của URL. Chữ không phải số (gõ tay, đường dẫn hỏng) và số vượt giới hạn
 * thì bỏ, không gửi lên server; số sai quy tắc (âm, khoảng ngược) vẫn gửi để server trả `400` nói rõ
 * chỗ sai bằng câu tiếng Việt (docs/api-design.md mục 6, `getRoomSearchErrorMessages`).
 */
export function parseRoomSearchParams(query: URLSearchParams): RoomSearchParams {
  const sortBy = ROOM_SEARCH_SORT_FIELDS.find((value) => value === query.get('sortBy'))
  const params: RoomSearchParams = {
    city: parseText(query.get('city')),
    ward: parseText(query.get('ward')),
    minPrice: parseNumber(query.get('minPrice'), MAX_MONEY),
    maxPrice: parseNumber(query.get('maxPrice'), MAX_MONEY),
    minArea: parseNumber(query.get('minArea'), MAX_AREA),
    maxArea: parseNumber(query.get('maxArea'), MAX_AREA),
    minOccupants: parseInteger(query.get('minOccupants'), MAX_INT),
    amenityIds: [...new Set(query.getAll('amenityIds').map(Number))].filter(
      (id) => Number.isInteger(id) && id > 0,
    ),
    sortBy,
    // Không có `sortBy` thì server bỏ qua chiều sắp xếp, nên cũng không giữ trên URL.
    sortDirection: sortBy
      ? ROOM_SEARCH_SORT_DIRECTIONS.find((value) => value === query.get('sortDirection'))
      : undefined,
    page: parsePage(query.get('page')),
  }
  return params
}

/** Query của URL cho bộ lọc, theo thứ tự cố định; bỏ trường trống và trang 1. */
export function toRoomSearchQuery(params: RoomSearchParams): URLSearchParams {
  const query = new URLSearchParams()
  const set = (key: string, value: string | number | undefined) => {
    if (value !== undefined) query.set(key, String(value))
  }
  set('city', params.city)
  set('ward', params.ward)
  set('minPrice', params.minPrice)
  set('maxPrice', params.maxPrice)
  set('minArea', params.minArea)
  set('maxArea', params.maxArea)
  set('minOccupants', params.minOccupants)
  params.amenityIds.forEach((id) => query.append('amenityIds', String(id)))
  set('sortBy', params.sortBy)
  set('sortDirection', params.sortBy ? params.sortDirection : undefined)
  if (params.page > 1) set('page', params.page)
  return query
}

/** Số bộ lọc đang áp dụng (không tính sắp xếp, trang), hiện trên nút mở bộ lọc ở điện thoại. */
export function countActiveRoomSearchFilters(params: RoomSearchParams): number {
  const fields = [
    params.city,
    params.ward,
    params.minPrice,
    params.maxPrice,
    params.minArea,
    params.maxArea,
    params.minOccupants,
  ]
  return fields.filter((value) => value !== undefined).length + params.amenityIds.length
}

export function toRoomSearchFormValues(params: RoomSearchParams): RoomSearchFormValues {
  const text = (value: number | undefined) => (value === undefined ? '' : String(value))
  return {
    city: params.city ?? '',
    ward: params.ward ?? '',
    minPrice: text(params.minPrice),
    maxPrice: text(params.maxPrice),
    minArea: params.minArea === undefined ? '' : toRoomAreaInput(String(params.minArea)),
    maxArea: params.maxArea === undefined ? '' : toRoomAreaInput(String(params.maxArea)),
    minOccupants: text(params.minOccupants),
    amenityIds: params.amenityIds,
  }
}

/**
 * Bộ lọc mới từ form đã qua kiểm tra; giữ cách sắp xếp đang chọn và về trang 1, vì số trang của bộ
 * lọc mới khác.
 */
export function fromRoomSearchFormValues(
  values: RoomSearchFormValues,
  current: Pick<RoomSearchParams, 'sortBy' | 'sortDirection'>,
): RoomSearchParams {
  const money = (value: string) => optionalNumber(normalizeRoomMoney(value))
  const area = (value: string) => optionalNumber(normalizeRoomArea(value))
  const city = parseText(values.city)
  return {
    city,
    // Phường/xã chỉ có nghĩa khi đã chọn tỉnh (tên phường trùng nhau giữa các tỉnh).
    ward: city ? parseText(values.ward) : undefined,
    minPrice: money(values.minPrice),
    maxPrice: money(values.maxPrice),
    minArea: area(values.minArea),
    maxArea: area(values.maxArea),
    minOccupants: optionalNumber(values.minOccupants.trim()),
    amenityIds: values.amenityIds,
    sortBy: current.sortBy,
    sortDirection: current.sortDirection,
    page: 1,
  }
}

// Kiểm tra ô của form theo các trường hợp `400` ở docs/api-design.md mục 6; ô trống là không lọc.

export function validateSearchMoney(input: string): true | string {
  const value = normalizeRoomMoney(input)
  if (value === '') return true
  if (!/^\d+$/.test(value)) return 'Nhập số đồng nguyên, không âm.'
  return true
}

export function validateSearchArea(input: string): true | string {
  const value = normalizeRoomArea(input)
  if (value === '') return true
  if (!/^\d+(\.\d+)?$/.test(value)) return 'Nhập diện tích bằng số, không âm.'
  return true
}

export function validateSearchOccupants(input: string): true | string {
  const value = input.trim()
  if (value === '') return true
  if (!/^\d+$/.test(value) || Number(value) < 1) return 'Số người phải là số nguyên từ 1 trở lên.'
  return true
}

/** Ô "đến" không được nhỏ hơn ô "từ"; chỉ so khi cả hai ô đều là số hợp lệ. */
export function isRangeValid(min: number | undefined, max: number | undefined): boolean {
  return min === undefined || max === undefined || min <= max
}

export function parseSearchMoney(input: string): number | undefined {
  return validateSearchMoney(input) === true ? optionalNumber(normalizeRoomMoney(input)) : undefined
}

export function parseSearchArea(input: string): number | undefined {
  return validateSearchArea(input) === true ? optionalNumber(normalizeRoomArea(input)) : undefined
}

/**
 * Câu lỗi của `400` từ `GET /rooms/search`. Endpoint này không gửi `detail` mà để câu trong `errors`
 * theo từng trường; các câu do `RoomSearchQueryValidator` viết bằng tiếng Việt. Lỗi server không đọc
 * được số (câu tiếng Anh) không tới được đây vì `parseRoomSearchParams` đã bỏ các số đó. Không đọc
 * được thì trả mảng rỗng để trang hiện câu chung.
 */
export function getRoomSearchErrorMessages(data: unknown): string[] {
  if (typeof data !== 'object' || data === null || !('errors' in data)) return []
  const { errors } = data
  if (typeof errors !== 'object' || errors === null) return []
  const messages = Object.values(errors).flatMap((value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [],
  )
  return [...new Set(messages)]
}

function parseText(value: string | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function parseNumber(value: string | null, max: number): number | undefined {
  if (value === null || value.trim() === '') return undefined
  const number = Number(value)
  // Số rất nhỏ hay rất lớn thành dạng "1e-7" khi ghi lại lên query, server không đọc được.
  return Number.isFinite(number) && Math.abs(number) <= max && /^-?\d+(\.\d+)?$/.test(String(number))
    ? number
    : undefined
}

function parseInteger(value: string | null, max: number): number | undefined {
  const number = parseNumber(value, max)
  return number !== undefined && Number.isInteger(number) ? number : undefined
}

function parsePage(value: string | null): number {
  const page = Number(value)
  return Number.isInteger(page) && page > 1 ? page : 1
}

function optionalNumber(value: string): number | undefined {
  return value === '' ? undefined : Number(value)
}
