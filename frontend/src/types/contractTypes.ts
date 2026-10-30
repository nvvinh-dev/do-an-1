import type { PaymentMethod, PaymentQr } from '@/types/paymentTypes'

/** Trạng thái hợp đồng, theo thứ tự trong vòng đời (docs/design-system.md mục 7). */
export const CONTRACT_STATUSES = [
  'Nhap',
  'ChoNguoiThueXacNhan',
  'ChoNhanCoc',
  'DangHieuLuc',
  'SapHetHan',
  'DangThanhLy',
  'DaThanhLy',
  'DaHuy',
] as const

export type ContractStatus = (typeof CONTRACT_STATUSES)[number]

/** Query của `GET /contracts`; bỏ trống thì server dùng mặc định. `roomId` chỉ dành cho Chủ trọ. */
export interface ContractListParams {
  status?: ContractStatus
  page?: number
}

/** Phòng gắn với hợp đồng. */
export interface ContractRoom {
  id: number
  code: string
  propertyName: string
}

/** Một dòng của `GET /contracts` (docs/api-design.md mục 8, "Danh sách và chi tiết"). */
export interface ContractListItem {
  id: number
  room: ContractRoom
  tenantName: string
  landlordName: string
  rentPrice: number
  /** Ngày thuần `YYYY-MM-DD`. */
  startDate: string
  endDate: string
  status: ContractStatus
  /** Thời điểm duyệt yêu cầu thuê gốc + 72 giờ, chỉ có khi `Nhap`, `ChoNguoiThueXacNhan`, `ChoNhanCoc`. */
  holdExpiresAt: string | null
}

/** Một bên của hợp đồng; `phoneNumber` chỉ có khi được phép theo FR-74. */
export interface ContractParty {
  fullName: string
  phoneNumber: string | null
}

export interface ContractServiceFee {
  name: string
  amount: number
}

export interface ContractOccupant {
  fullName: string
  phoneNumber: string | null
}

/** Thông tin hoàn cọc, chỉ có khi Chủ trọ đã ghi nhận hoàn (FR-86). */
export interface DepositRefund {
  amount: number
  refundedAt: string
  method: PaymentMethod
  note: string | null
}

/** Thông báo trả phòng của hợp đồng (docs/api-design.md mục 10). */
export interface MoveOutNotice {
  noticeAt: string
  noticeBy: 'Landlord' | 'Tenant'
  expectedMoveOutDate: string
  reason: string
  noticeDays: number
  penaltyAllowed: boolean
}

/** Response của `GET /contracts/{id}`. */
export interface ContractDetail {
  id: number
  rentalRequestId: number | null
  room: ContractRoom
  tenant: ContractParty
  landlord: ContractParty
  rentPrice: number
  electricityUnitPrice: number
  waterUnitPrice: number
  depositAmount: number
  initialElectricityIndex: number
  initialWaterIndex: number
  startDate: string
  endDate: string
  paymentDueDays: number
  serviceFees: ContractServiceFee[]
  occupants: ContractOccupant[]
  status: ContractStatus
  tenantConfirmedAt: string | null
  depositReceivedAt: string | null
  depositReceivedMethod: PaymentMethod | null
  activatedAt: string | null
  cancelReason: string | null
  /** `System` khi hợp đồng tự hủy vì quá hạn giữ chỗ. */
  cancelledBy: 'Landlord' | 'Tenant' | 'System' | null
  cancelledAt: string | null
  holdExpiresAt: string | null
  /** Chỉ có với Người thuê đứng tên khi `ChoNhanCoc` và tiền cọc > 0. */
  paymentQr: PaymentQr | null
  depositRefund: DepositRefund | null
  /** `true` khi `DaHuy`, đã nhận cọc mà Chủ trọ chưa ghi nhận hoàn. */
  depositRefundPending: boolean
  moveOutNotice: MoveOutNotice | null
  settlementInvoiceId: number | null
  terminatedAt: string | null
}

/** Body của `POST /contracts/{id}/request-changes` và `POST /contracts/{id}/cancel`: lý do bắt buộc. */
export interface ContractReasonRequest {
  reason: string
}
