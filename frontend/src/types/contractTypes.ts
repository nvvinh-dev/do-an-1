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

/**
 * Body của `POST /contracts/{id}/move-out-notice`. `expectedMoveOutDate` dạng `YYYY-MM-DD`, không trước hôm
 * nay (`422`); `reason` bắt buộc, tối đa 500 ký tự. Response là `MoveOutNotice` của hợp đồng vừa gửi.
 */
export interface SendMoveOutNoticeRequest {
  expectedMoveOutDate: string
  reason: string
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

/**
 * Body của `POST /contracts` (kèm `rentalRequestId`) và `PUT /contracts/{id}` (docs/api-design.md mục 8):
 * chốt cứng giá tại thời điểm lập. Ngày dạng `YYYY-MM-DD`.
 */
export interface ContractTermsRequest {
  rentPrice: number
  electricityUnitPrice: number
  waterUnitPrice: number
  depositAmount: number
  initialElectricityIndex: number
  initialWaterIndex: number
  startDate: string
  endDate: string
  /** Từ 1 tới 30. */
  paymentDueDays: number
  serviceFees: ContractServiceFee[]
  occupants: ContractOccupant[]
}

export interface CreateContractRequest extends ContractTermsRequest {
  rentalRequestId: number
}

/** Giá trị của form lập, sửa hợp đồng: chuỗi người dùng gõ, đổi sang `ContractTermsRequest` khi gửi. */
export interface ContractFormValues {
  rentPrice: string
  electricityUnitPrice: string
  waterUnitPrice: string
  depositAmount: string
  initialElectricityIndex: string
  initialWaterIndex: string
  startDate: string
  endDate: string
  paymentDueDays: string
  serviceFees: { name: string; amount: string }[]
  occupants: { fullName: string; phoneNumber: string }[]
}

/** Response của `GET /rooms/{id}/meter-readings/latest`; `null` khi phòng chưa từng có hợp đồng. */
export interface MeterReading {
  electricityIndex: number
  waterIndex: number
}

/** Body của `POST /contracts/{id}/deposit/confirm`. `receivedAt` không sau thời điểm hiện tại. */
export interface ConfirmDepositRequest {
  receivedAt: string
  method: PaymentMethod
}

/**
 * Body của `POST /contracts/{id}/deposit/refund`. `amount` và `note` chỉ dùng khi Người thuê là bên hủy;
 * Chủ trọ hủy thì server hoàn đủ tiền cọc.
 */
export interface RefundDepositRequest {
  refundedAt: string
  refundMethod: PaymentMethod
  amount: number | null
  note: string | null
}

/** Body của `PATCH /contracts/{id}/initial-meter-readings`. */
export interface InitialMeterReadingsRequest {
  initialElectricityIndex: number
  initialWaterIndex: number
}
