import type { ContractDetail, ContractFormValues, ContractTermsRequest, MeterReading } from '@/types/contractTypes'
import type { RoomDetail } from '@/types/roomTypes'
import { PHONE_PATTERN } from '@/utils/phonePattern'
import { normalizeRoomMoney } from '@/utils/validateRoomInput'

// Ràng buộc theo api-design mục 8 và ContractTermsRequestValidator: chỉ số `numeric(12,2)`, hạn
// thanh toán 1–30 ngày, số điện thoại người ở cùng tối đa 20 ký tự.
const MAX_METER_INDEX = 9999999999.99
const PHONE_MAX_LENGTH = 20

/** Chỉ số gõ bằng dấu phẩy thập phân ("1182,5") đổi sang dấu chấm như API nhận. */
export function normalizeMeterIndex(value: string): string {
  const trimmed = value.trim()
  return /^\d+,\d{1,2}$/.test(trimmed) ? trimmed.replace(',', '.') : trimmed
}

export function validateMeterIndex(input: string): true | string {
  const value = normalizeMeterIndex(input)
  if (value === '') return 'Vui lòng nhập chỉ số.'
  if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) > MAX_METER_INDEX) {
    return 'Chỉ số là số không âm, có tối đa 2 số lẻ.'
  }
  return true
}

export function validatePaymentDueDays(input: string): true | string {
  const value = input.trim()
  if (value === '') return 'Vui lòng nhập số ngày.'
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 30) return 'Hạn thanh toán từ 1 tới 30 ngày.'
  return true
}

/** `startDate` không trước hôm nay (giờ Việt Nam); các chuỗi `YYYY-MM-DD` so sánh trực tiếp được. */
export function validateStartDate(value: string, today: string): true | string {
  if (value === '') return 'Vui lòng chọn ngày bắt đầu.'
  return value >= today || 'Ngày bắt đầu không được trước hôm nay.'
}

export function validateEndDate(value: string, startDate: string): true | string {
  if (value === '') return 'Vui lòng chọn ngày kết thúc.'
  return startDate === '' || value > startDate || 'Ngày kết thúc phải sau ngày bắt đầu.'
}

export function validateOccupantPhone(input: string): true | string {
  const value = input.trim()
  if (value === '') return true
  if (value.length > PHONE_MAX_LENGTH || !PHONE_PATTERN.test(value)) {
    return 'Số điện thoại gồm 10–11 chữ số, bắt đầu bằng 0.'
  }
  return true
}

/**
 * Người đứng tên cũng ở phòng, nên số người ở cùng tối đa là `maxOccupants` − 1 (BR-11). Server
 * vẫn kiểm tra lại và trả `422` khi vượt.
 */
export function getMaxCoOccupants(maxOccupants: number): number {
  return Math.max(0, maxOccupants - 1)
}

/** Đổi giá trị form (đã qua kiểm tra) sang body `POST`/`PUT /contracts`. */
export function toContractTermsRequest(values: ContractFormValues): ContractTermsRequest {
  return {
    rentPrice: Number(normalizeRoomMoney(values.rentPrice)),
    electricityUnitPrice: Number(normalizeRoomMoney(values.electricityUnitPrice)),
    waterUnitPrice: Number(normalizeRoomMoney(values.waterUnitPrice)),
    depositAmount: Number(normalizeRoomMoney(values.depositAmount)),
    initialElectricityIndex: Number(normalizeMeterIndex(values.initialElectricityIndex)),
    initialWaterIndex: Number(normalizeMeterIndex(values.initialWaterIndex)),
    startDate: values.startDate,
    endDate: values.endDate,
    paymentDueDays: Number(values.paymentDueDays.trim()),
    serviceFees: values.serviceFees.map((fee) => ({
      name: fee.name.trim(),
      amount: Number(normalizeRoomMoney(fee.amount)),
    })),
    occupants: values.occupants.map((occupant) => ({
      fullName: occupant.fullName.trim(),
      phoneNumber: occupant.phoneNumber.trim() === '' ? null : occupant.phoneNumber.trim(),
    })),
  }
}

/** Chỉ số hiện trong ô nhập: dấu phẩy thập phân như cách viết số Việt Nam. */
function toMeterInput(value: number): string {
  return String(value).replace('.', ',')
}

/**
 * Giá trị ban đầu khi lập hợp đồng (docs/frontend-screens.md mục 6, "L6 — form lập hợp đồng"): giá thuê,
 * đơn giá, phí dịch vụ lấy từ phòng; chỉ số đầu lấy từ chỉ số cuối của phòng, chưa có thì để trống cho
 * Chủ trọ đọc đồng hồ. Ngày bắt đầu điền ngày người thuê dự kiến vào ở nếu chưa qua.
 */
export function getNewContractFormValues(
  room: RoomDetail,
  latestReading: MeterReading | null,
  expectedMoveInDate: string,
  today: string,
): ContractFormValues {
  return {
    rentPrice: String(room.rentPrice),
    electricityUnitPrice: String(room.electricityUnitPrice),
    waterUnitPrice: String(room.waterUnitPrice),
    depositAmount: '',
    initialElectricityIndex: latestReading ? toMeterInput(latestReading.electricityIndex) : '',
    initialWaterIndex: latestReading ? toMeterInput(latestReading.waterIndex) : '',
    startDate: expectedMoveInDate >= today ? expectedMoveInDate : '',
    endDate: '',
    paymentDueDays: '',
    serviceFees: room.serviceFees.map((fee) => ({ name: fee.name, amount: String(fee.amount) })),
    occupants: [],
  }
}

/** Giá trị ban đầu khi sửa hợp đồng nháp: đúng điều khoản đang lưu. */
export function getContractFormValues(contract: ContractDetail): ContractFormValues {
  return {
    rentPrice: String(contract.rentPrice),
    electricityUnitPrice: String(contract.electricityUnitPrice),
    waterUnitPrice: String(contract.waterUnitPrice),
    depositAmount: String(contract.depositAmount),
    initialElectricityIndex: toMeterInput(contract.initialElectricityIndex),
    initialWaterIndex: toMeterInput(contract.initialWaterIndex),
    startDate: contract.startDate,
    endDate: contract.endDate,
    paymentDueDays: String(contract.paymentDueDays),
    serviceFees: contract.serviceFees.map((fee) => ({ name: fee.name, amount: String(fee.amount) })),
    occupants: contract.occupants.map((occupant) => ({
      fullName: occupant.fullName,
      phoneNumber: occupant.phoneNumber ?? '',
    })),
  }
}
