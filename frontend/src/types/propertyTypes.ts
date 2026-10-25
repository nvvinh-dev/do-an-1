/** Trạng thái khu trọ (docs/design-system.md mục 7). */
export type PropertyStatus = 'DangKhaiThac' | 'LuuTru'

/** Body chung của `POST /properties` và `PUT /properties/{id}` (docs/api-design.md mục 5.1). */
export interface PropertyRequest {
  name: string
  address: string
  city: string
  ward: string
  description: string | null
  /** Chỉ nhận tiện ích phạm vi `KhuTro`. `PUT` thay toàn bộ danh sách cũ. */
  amenityIds: number[]
  /** Tối đa 10 ảnh `AnhKhuTro`; thứ tự là thứ tự hiển thị, ảnh đầu là ảnh đại diện. `PUT` thay toàn bộ danh sách cũ. */
  imagePaths: string[]
}

/** Số phòng theo trạng thái khai thác, không tính phòng đã lưu trữ. */
export interface RoomCounts {
  total: number
  trong: number
  dangGiuCho: number
  dangThue: number
  baoTri: number
}

/** Tiện ích đã gắn với khu trọ hoặc phòng. */
export interface AmenityReference {
  id: number
  name: string
}

/** Ảnh công khai. `path` là giá trị gửi lại trong `imagePaths` khi sửa. */
export interface PropertyImage {
  path: string
  url: string
}

/** Response của `GET /properties/{id}`, `POST` và `PUT`. */
export interface PropertyDetail {
  id: number
  name: string
  address: string
  city: string
  ward: string
  description: string | null
  status: PropertyStatus
  amenities: AmenityReference[]
  images: PropertyImage[]
  roomCounts: RoomCounts
}

/** Một dòng của `GET /properties` (không phân trang). */
export interface PropertyListItem {
  id: number
  name: string
  address: string
  city: string
  ward: string
  status: PropertyStatus
  coverImageUrl: string | null
  roomCounts: RoomCounts
}
