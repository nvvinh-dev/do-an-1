export const ROOM_SEARCH_SORT_FIELDS = ['price', 'area'] as const
export type RoomSearchSortBy = (typeof ROOM_SEARCH_SORT_FIELDS)[number]

export const ROOM_SEARCH_SORT_DIRECTIONS = ['asc', 'desc'] as const
export type RoomSearchSortDirection = (typeof ROOM_SEARCH_SORT_DIRECTIONS)[number]

/**
 * Bộ lọc của `GET /rooms/search` (docs/api-design.md mục 6), cũng là query của trang P1: tên trường
 * trên URL trùng tên tham số API để chia sẻ đường dẫn là chia sẻ đúng kết quả.
 */
export interface RoomSearchParams {
  city?: string
  ward?: string
  minPrice?: number
  maxPrice?: number
  minArea?: number
  maxArea?: number
  minOccupants?: number
  /** Phòng phải có đủ mọi tiện ích, tính cả tiện ích của khu trọ; lặp lại trên query. */
  amenityIds: number[]
  /** Không có thì phòng mới thêm xếp trước. */
  sortBy?: RoomSearchSortBy
  sortDirection?: RoomSearchSortDirection
  page: number
}

/** Một phòng trong kết quả tìm kiếm; không có thông tin liên hệ của Chủ trọ (QR-07). */
export interface RoomSearchItem {
  id: number
  code: string
  propertyName: string
  address: string
  city: string
  ward: string
  rentPrice: number
  area: number
  maxOccupants: number
  coverImageUrl: string | null
  /** Tên tiện ích của phòng và của khu trọ, theo thứ tự trong danh mục. */
  amenities: string[]
}

/** Giá trị của form bộ lọc: chuỗi người dùng gõ, đổi sang `RoomSearchParams` khi bấm Tìm. */
export interface RoomSearchFormValues {
  city: string
  ward: string
  minPrice: string
  maxPrice: string
  minArea: string
  maxArea: string
  minOccupants: string
  amenityIds: number[]
}
