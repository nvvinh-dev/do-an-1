/** Trạng thái yêu cầu thuê, theo thứ tự trong vòng đời (docs/design-system.md mục 7). */
export const RENTAL_REQUEST_STATUSES = ['ChoDuyet', 'DaDuyet', 'DaLapHopDong', 'TuChoi', 'DaHuy', 'HetHan'] as const

export type RentalRequestStatus = (typeof RENTAL_REQUEST_STATUSES)[number]

/** Body của `POST /rooms/{roomId}/rental-requests` (docs/api-design.md mục 7). */
export interface SubmitRentalRequestRequest {
  /** `YYYY-MM-DD`, không trước hôm nay theo giờ Việt Nam. */
  expectedMoveInDate: string
  /** Từ 1 tới `maxOccupants` của phòng (BR-11). */
  expectedOccupants: number
  /** Tối đa 500 ký tự. */
  note: string | null
}

/** Query của `GET /rental-requests`; bỏ trống thì server dùng mặc định. */
export interface RentalRequestListParams {
  status?: RentalRequestStatus
  page?: number
}

/** Phòng gắn với yêu cầu thuê. */
export interface RentalRequestRoom {
  id: number
  code: string
  propertyName: string
}

/** Một dòng của `GET /rental-requests`. */
export interface RentalRequestListItem {
  id: number
  room: RentalRequestRoom
  tenantName: string
  expectedMoveInDate: string
  expectedOccupants: number
  status: RentalRequestStatus
  submittedAt: string
  /** `submittedAt` + 168 giờ, chỉ có khi `ChoDuyet`. */
  expiresAt: string | null
  /** `processedAt` + 72 giờ, chỉ có khi `DaDuyet`. */
  holdExpiresAt: string | null
}

/** Response của `GET /rental-requests/{id}` và `POST /rooms/{roomId}/rental-requests`. */
export interface RentalRequestDetail extends RentalRequestListItem {
  note: string | null
  processedAt: string | null
  rejectReason: string | null
  /** Chỉ có khi `DaLapHopDong`. */
  contractId: number | null
  /** Số điện thoại bên còn lại, chỉ có khi `DaDuyet` và còn hạn giữ chỗ (QR-07). */
  otherPartyPhoneNumber: string | null
}
