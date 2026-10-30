import type { AmenityReference, PropertyImage } from '@/types/propertyTypes'

export type RoomOccupancyStatus = 'Trong' | 'DangGiuCho' | 'DangThue' | 'BaoTri' | 'LuuTru'
export type RoomVisibilityStatus = 'DangHienThi' | 'DaAnBoiChuTro' | 'DaAnBoiAdmin'

/** Chủ trọ chỉ tự đặt được hai trạng thái hiển thị này; `DaAnBoiAdmin` do Admin đặt (API mục 5.2). */
export type LandlordRoomVisibilityStatus = Extract<RoomVisibilityStatus, 'DangHienThi' | 'DaAnBoiChuTro'>

/** Chủ trọ chỉ tự chuyển phòng giữa Trống và Bảo trì; các trạng thái khác do hệ thống chuyển (FR-89). */
export type LandlordRoomOccupancyStatus = Extract<RoomOccupancyStatus, 'Trong' | 'BaoTri'>

export interface RoomServiceFee {
  name: string
  amount: number
}

/** Body chung của POST và PUT phòng; PUT thay toàn bộ ba danh sách (API mục 5.2). */
export interface RoomRequest {
  code: string
  area: number
  maxOccupants: number
  rentPrice: number
  electricityUnitPrice: number
  waterUnitPrice: number
  description: string | null
  serviceFees: RoomServiceFee[]
  amenityIds: number[]
  imagePaths: string[]
}

export interface RoomListItem {
  id: number
  code: string
  area: number
  maxOccupants: number
  rentPrice: number
  occupancyStatus: RoomOccupancyStatus
  visibilityStatus: RoomVisibilityStatus
  isListed: boolean
  coverImageUrl: string | null
}

export interface RoomDetail extends Omit<RoomListItem, 'coverImageUrl'> {
  propertyId: number
  propertyName: string
  electricityUnitPrice: number
  waterUnitPrice: number
  description: string | null
  serviceFees: RoomServiceFee[]
  amenities: AmenityReference[]
  images: PropertyImage[]
  currentContractId: number | null
}

/** Giữ chuỗi nhập để phân biệt ô trống với số 0; chỉ đổi thành số sau khi kiểm tra. */
export interface RoomFormValues {
  code: string
  area: string
  maxOccupants: string
  rentPrice: string
  electricityUnitPrice: string
  waterUnitPrice: string
  description: string
  serviceFees: { name: string; amount: string }[]
  amenityIds: number[]
}
