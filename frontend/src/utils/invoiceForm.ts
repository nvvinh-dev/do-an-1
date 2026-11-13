import type { UploadedImage } from '@/types/fileTypes'
import type { ContractInvoiceListItem, InvoiceDetail, PeriodicInvoiceRequest } from '@/types/invoiceTypes'
import { normalizeMeterIndex } from '@/utils/contractForm'
import { normalizeLineAmount, photoOf, toMeterInput } from '@/utils/settlementForm'
import { normalizeRoomMoney } from '@/utils/validateRoomInput'

const MAX_AMOUNT = 999999999999

/** Một dòng điều chỉnh Chủ trọ nhập ở L7: chuỗi người dùng gõ, đổi sang `InvoiceAdjustmentLineRequest` khi gửi. */
export interface AdjustmentLineFormValues {
  description: string
  amount: string
  /** Mã hóa đơn gốc dạng chuỗi, `''` khi không chọn. */
  relatedInvoiceId: string
}

export interface InvoiceFormValues {
  currentElectricityIndex: string
  currentWaterIndex: string
  electricityPhoto: UploadedImage[]
  waterPhoto: UploadedImage[]
  adjustmentLines: AdjustmentLineFormValues[]
}

export function emptyAdjustmentLine(): AdjustmentLineFormValues {
  return { description: '', amount: '', relatedInvoiceId: '' }
}

/** Lập hóa đơn mới: chỉ số để trống cho Chủ trọ đọc đồng hồ, chưa có ảnh và dòng điều chỉnh. */
export function getNewInvoiceFormValues(): InvoiceFormValues {
  return {
    currentElectricityIndex: '',
    currentWaterIndex: '',
    electricityPhoto: [],
    waterPhoto: [],
    adjustmentLines: [],
  }
}

/**
 * Sửa hóa đơn: đúng hóa đơn đang lưu. Ảnh lấy `path` đã lưu (chỉ Chủ trọ nhận), vì `PUT` ghi đè ảnh bằng đúng
 * đường dẫn gửi lên — gửi URL có chữ ký hay bỏ trống là mất ảnh (api-design mục 9).
 */
export function getInvoiceFormValues(invoice: InvoiceDetail): InvoiceFormValues {
  return {
    currentElectricityIndex: toMeterInput(invoice.currentElectricityIndex),
    currentWaterIndex: toMeterInput(invoice.currentWaterIndex),
    electricityPhoto: photoOf(invoice.electricityMeterPhotoPath, invoice.electricityMeterPhotoUrl),
    waterPhoto: photoOf(invoice.waterMeterPhotoPath, invoice.waterMeterPhotoUrl),
    adjustmentLines: invoice.lines
      .filter((line) => line.category === 'DieuChinhKhac')
      .map((line) => ({
        description: line.description,
        amount: String(line.amount),
        relatedInvoiceId: line.relatedInvoiceId === null ? '' : String(line.relatedInvoiceId),
      })),
  }
}

/** Đổi giá trị form (đã qua kiểm tra) sang body `POST /contracts/{id}/invoices` và `PUT /invoices/{id}`. */
export function toPeriodicInvoiceRequest(values: InvoiceFormValues): PeriodicInvoiceRequest {
  return {
    currentElectricityIndex: Number(normalizeMeterIndex(values.currentElectricityIndex)),
    currentWaterIndex: Number(normalizeMeterIndex(values.currentWaterIndex)),
    electricityMeterPhotoPath: values.electricityPhoto[0]?.path ?? null,
    waterMeterPhotoPath: values.waterPhoto[0]?.path ?? null,
    adjustmentLines: values.adjustmentLines.map((line) => ({
      category: 'DieuChinhKhac',
      description: line.description.trim(),
      amount: Number(normalizeLineAmount(line.amount)),
      relatedInvoiceId: line.relatedInvoiceId === '' ? null : Number(line.relatedInvoiceId),
    })),
  }
}

/**
 * Số tiền người thuê báo đã trả, hoặc Chủ trọ xác nhận đã thu: số đồng nguyên lớn hơn 0 (api-design mục 1, dòng
 * "Tiền"). Không vượt phần còn phải trả do server kiểm tra và trả `422`, vì frontend không tự tính tiền.
 */
export function validatePaymentAmount(input: string): true | string {
  const value = normalizeRoomMoney(input)
  if (value === '') return 'Vui lòng nhập số tiền.'
  if (!/^\d+$/.test(value)) return 'Nhập số đồng nguyên, không có phần lẻ.'
  if (Number(value) === 0) return 'Số tiền phải lớn hơn 0.'
  if (Number(value) > MAX_AMOUNT) return 'Số tiền tối đa 999.999.999.999 đồng.'
  return true
}

/**
 * Hóa đơn định kỳ mới nhất chưa hủy của hợp đồng — chỉ hóa đơn này sửa, hủy được (FR-49, FR-52). Danh sách
 * `GET /contracts/{id}/invoices` đã xếp kỳ mới trước, nên là dòng định kỳ chưa hủy đầu tiên; `null` khi chưa có.
 */
export function getLatestPeriodicInvoiceId(invoices: ContractInvoiceListItem[]): number | null {
  return invoices.find((invoice) => invoice.type === 'DinhKy' && invoice.status !== 'DaHuy')?.id ?? null
}

/**
 * Hóa đơn gốc chọn được cho dòng điều chỉnh: hóa đơn định kỳ chưa hủy khác hóa đơn đang sửa (BR-16, api-design
 * mục 9 — sửa sai sót của hóa đơn cũ hơn hoặc đã thanh toán ở kỳ kế tiếp).
 */
export function getRelatedInvoiceOptions(
  invoices: ContractInvoiceListItem[],
  currentInvoiceId: number | null,
): ContractInvoiceListItem[] {
  return invoices.filter(
    (invoice) => invoice.type === 'DinhKy' && invoice.status !== 'DaHuy' && invoice.id !== currentInvoiceId,
  )
}
