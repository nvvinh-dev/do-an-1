import type { UploadedImage } from '@/types/fileTypes'
import type { InvoiceDetail } from '@/types/invoiceTypes'
import type { SettlementInvoiceRequest, SettlementLineCategory } from '@/types/settlementTypes'
import { normalizeMeterIndex } from '@/utils/contractForm'
import { normalizeRoomMoney } from '@/utils/validateRoomInput'

// Ràng buộc theo api-design mục 10 và SettlementInvoiceRequestValidator: tối đa 50 dòng, mô tả bắt buộc và tối đa
// 500 ký tự, số tiền là số đồng nguyên tối đa 12 chữ số.
export const MAX_SETTLEMENT_LINES = 50
const DESCRIPTION_MAX_LENGTH = 500
const MAX_LINE_AMOUNT = 999999999999

const SETTLEMENT_LINE_CATEGORIES: readonly SettlementLineCategory[] = ['BoiThuongHuHong', 'PhiPhat', 'DieuChinhKhac']

/** Một dòng Chủ trọ nhập: chuỗi người dùng gõ, đổi sang `SettlementInvoiceLineRequest` khi gửi. */
export interface SettlementLineFormValues {
  category: SettlementLineCategory
  description: string
  amount: string
  /** Ảnh hư hỏng, tối đa 1 ảnh; chỉ gửi với dòng bồi thường hư hỏng. */
  evidence: UploadedImage[]
  /** Mã hóa đơn gốc dạng chuỗi, `''` khi không chọn; chỉ gửi với dòng điều chỉnh khác. */
  relatedInvoiceId: string
}

export interface SettlementFormValues {
  currentElectricityIndex: string
  currentWaterIndex: string
  /** Ngày trả phòng thực tế dạng `YYYY-MM-DD`. */
  moveOutDate: string
  electricityPhoto: UploadedImage[]
  waterPhoto: UploadedImage[]
  lines: SettlementLineFormValues[]
}

export function isSettlementLineCategory(category: string): category is SettlementLineCategory {
  return (SETTLEMENT_LINE_CATEGORIES as readonly string[]).includes(category)
}

export function emptySettlementLine(category: SettlementLineCategory): SettlementLineFormValues {
  return { category, description: '', amount: '', evidence: [], relatedInvoiceId: '' }
}

/**
 * Giá trị ban đầu khi lập bảng: ngày trả phòng là ngày dự kiến trong thông báo, hoặc hôm nay nếu người thuê
 * dọn đi sớm hơn — `moveOutDate` không được sau hôm nay (API mục 10). Chỉ số để trống cho Chủ trọ đọc đồng hồ.
 */
export function getNewSettlementFormValues(expectedMoveOutDate: string | null, today: string): SettlementFormValues {
  return {
    currentElectricityIndex: '',
    currentWaterIndex: '',
    moveOutDate: expectedMoveOutDate !== null && expectedMoveOutDate <= today ? expectedMoveOutDate : today,
    electricityPhoto: [],
    waterPhoto: [],
    lines: [],
  }
}

function toMeterInput(value: number): string {
  return String(value).replace('.', ',')
}

function photoOf(path: string | null, url: string | null): UploadedImage[] {
  return path === null ? [] : [{ path, url }]
}

/**
 * Giá trị ban đầu khi sửa bảng ở Nháp: đúng bảng đang lưu. Ngày trả phòng thực tế là ngày cuối kỳ. Chỉ lấy
 * các dòng Chủ trọ đã nhập; dòng công nợ và trừ cọc server tự thêm lại khi lưu. Ảnh lấy `path` đã lưu, vì
 * `PUT` ghi đè ảnh bằng đúng đường dẫn gửi lên.
 */
export function getSettlementFormValues(invoice: InvoiceDetail): SettlementFormValues {
  const lines: SettlementLineFormValues[] = []
  for (const line of invoice.lines) {
    if (!isSettlementLineCategory(line.category)) continue
    lines.push({
      category: line.category,
      description: line.description,
      amount: String(line.amount),
      evidence: photoOf(line.evidencePath, line.evidenceUrl),
      relatedInvoiceId: line.relatedInvoiceId === null ? '' : String(line.relatedInvoiceId),
    })
  }

  return {
    currentElectricityIndex: toMeterInput(invoice.currentElectricityIndex),
    currentWaterIndex: toMeterInput(invoice.currentWaterIndex),
    moveOutDate: invoice.periodEnd,
    electricityPhoto: photoOf(invoice.electricityMeterPhotoPath, invoice.electricityMeterPhotoUrl),
    waterPhoto: photoOf(invoice.waterMeterPhotoPath, invoice.waterMeterPhotoUrl),
    lines,
  }
}

/** Số tiền của dòng: bỏ dấu chấm hàng nghìn ("1.500.000"), giữ dấu trừ ở đầu ("-200.000" → "-200000"). */
export function normalizeLineAmount(value: string): string {
  const trimmed = value.trim()
  const negative = trimmed.startsWith('-')
  const digits = normalizeRoomMoney(negative ? trimmed.slice(1) : trimmed)
  return negative ? `-${digits}` : digits
}

/**
 * Bồi thường hư hỏng và phí phạt là số đồng nguyên lớn hơn 0; điều chỉnh khác nhận cả số âm để giảm tiền
 * (API mục 10). Server kiểm tra lại và trả `422`.
 */
export function validateLineAmount(input: string, category: SettlementLineCategory): true | string {
  const value = normalizeLineAmount(input)
  if (value === '' || value === '-') return 'Vui lòng nhập số tiền.'
  if (category === 'DieuChinhKhac') {
    if (!/^-?\d+$/.test(value)) return 'Nhập số đồng nguyên; khoản giảm thì thêm dấu trừ ở đầu.'
  } else if (!/^\d+$/.test(value) || Number(value) === 0) {
    return 'Nhập số đồng nguyên lớn hơn 0.'
  }
  if (Math.abs(Number(value)) > MAX_LINE_AMOUNT) return 'Số tiền tối đa 999.999.999.999 đồng.'
  return true
}

/** Mỗi khoản là một dòng riêng có mô tả (BR-22). */
export function validateLineDescription(input: string): true | string {
  const value = input.trim()
  if (value === '') return 'Vui lòng ghi mô tả khoản này.'
  if (value.length > DESCRIPTION_MAX_LENGTH) return `Mô tả tối đa ${DESCRIPTION_MAX_LENGTH} ký tự.`
  return true
}

/**
 * Ngày trả phòng thực tế: không sau hôm nay (bảng lập vào hoặc sau ngày trả phòng, API trả `409`) và không trước
 * ngày bắt đầu hợp đồng (trước đó thì hủy hợp đồng, API trả `422`). Chuỗi `YYYY-MM-DD` so sánh trực tiếp được.
 */
export function validateMoveOutDate(value: string, startDate: string, today: string): true | string {
  if (value === '') return 'Vui lòng chọn ngày trả phòng.'
  if (value > today) return 'Ngày trả phòng không được sau hôm nay; lập bảng vào hoặc sau ngày người thuê dọn đi.'
  if (value < startDate) return 'Ngày trả phòng không được trước ngày bắt đầu hợp đồng.'
  return true
}

/** Chỉ số mới không nhỏ hơn chỉ số cũ (BR-14); gọi sau khi chuỗi đã đúng định dạng. */
export function validateNotBelowPrevious(input: string, previous: number | null): true | string {
  if (previous === null) return true
  return Number(normalizeMeterIndex(input)) >= previous || 'Chỉ số mới không được nhỏ hơn chỉ số cũ.'
}

/** Đổi giá trị form (đã qua kiểm tra) sang body `POST`/`PUT /contracts/{id}/settlement-invoice`. */
export function toSettlementInvoiceRequest(values: SettlementFormValues): SettlementInvoiceRequest {
  return {
    currentElectricityIndex: Number(normalizeMeterIndex(values.currentElectricityIndex)),
    currentWaterIndex: Number(normalizeMeterIndex(values.currentWaterIndex)),
    moveOutDate: values.moveOutDate,
    electricityMeterPhotoPath: values.electricityPhoto[0]?.path ?? null,
    waterMeterPhotoPath: values.waterPhoto[0]?.path ?? null,
    lines: values.lines.map((line) => ({
      category: line.category,
      description: line.description.trim(),
      amount: Number(normalizeLineAmount(line.amount)),
      evidencePath: line.category === 'BoiThuongHuHong' ? (line.evidence[0]?.path ?? null) : null,
      relatedInvoiceId:
        line.category === 'DieuChinhKhac' && line.relatedInvoiceId !== '' ? Number(line.relatedInvoiceId) : null,
    })),
  }
}
