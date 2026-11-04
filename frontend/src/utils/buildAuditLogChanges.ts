import type { AuditLogChange, AuditLogJsonValue } from '@/types/auditLogTypes'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { formatDateTime } from '@/utils/formatDateTime'
import { formatMeterIndex } from '@/utils/formatMeterIndex'
import { getPaymentMethodLabel } from '@/utils/paymentMethodLabels'
import { getStatusDisplay, type StatusKind } from '@/utils/statusLabels'

/** Ô không có giá trị: thao tác không ghi trường này ở vế đó, hoặc trường đang trống. */
const EMPTY_VALUE = '—'

/** Nhãn của các trường service ghi vào nhật ký; trường lạ hiện nguyên tên. */
const FIELD_LABELS: Record<string, string> = {
  AccountName: 'Tên chủ tài khoản',
  AccountNumber: 'Số tài khoản',
  Amount: 'Số tiền',
  BankBin: 'Mã ngân hàng',
  CancelReason: 'Lý do hủy',
  CancelledBy: 'Bên hủy',
  Category: 'Loại dòng',
  ConfirmedAmount: 'Số tiền đã xác nhận',
  CurrentElectricityIndex: 'Chỉ số điện mới',
  CurrentWaterIndex: 'Chỉ số nước mới',
  DepositAmount: 'Tiền cọc',
  DepositReceivedAt: 'Ngày nhận cọc',
  DepositReceivedMethod: 'Hình thức nhận cọc',
  DepositRefundMethod: 'Hình thức hoàn cọc',
  DepositRefundNote: 'Ghi chú hoàn cọc',
  DepositRefundedAmount: 'Số tiền hoàn cọc',
  DepositRefundedAt: 'Ngày hoàn cọc',
  Description: 'Nội dung',
  DueDate: 'Hạn thanh toán',
  ElectricityAmount: 'Tiền điện',
  ElectricityUnitPrice: 'Đơn giá điện',
  EvidencePath: 'Minh chứng',
  InitialElectricityIndex: 'Chỉ số điện đầu',
  InitialWaterIndex: 'Chỉ số nước đầu',
  InvoiceStatus: 'Trạng thái hóa đơn',
  IsLocked: 'Đang khóa',
  Lines: 'Các dòng khác',
  Name: 'Tên khoản',
  Note: 'Ghi chú',
  PaidAmount: 'Đã thanh toán',
  PaymentReportId: 'Mã lượt báo thanh toán',
  PeriodEnd: 'Đến ngày',
  PeriodStart: 'Từ ngày',
  PhoneNumberConfirmed: 'Đã xác minh số điện thoại',
  PreviousElectricityIndex: 'Chỉ số điện cũ',
  PreviousWaterIndex: 'Chỉ số nước cũ',
  Reason: 'Lý do',
  RejectReason: 'Lý do từ chối',
  RelatedInvoiceId: 'Mã hóa đơn liên quan',
  RentAmount: 'Tiền thuê',
  RentPrice: 'Giá thuê',
  ReportedAmount: 'Số tiền đã báo',
  Role: 'Vai trò',
  RoomStatus: 'Trạng thái phòng',
  SentAt: 'Ngày gửi',
  ServiceFeeAmount: 'Tiền phí dịch vụ',
  ServiceFees: 'Phí dịch vụ',
  SettlementInvoiceId: 'Mã bảng thanh lý',
  Status: 'Trạng thái',
  TerminatedAt: 'Ngày kết thúc',
  TotalAmount: 'Tổng tiền',
  VerifiedPhoneNumber: 'Số điện thoại đã xác minh',
  WaterAmount: 'Tiền nước',
  WaterUnitPrice: 'Đơn giá nước',
}

const MONEY_FIELDS = new Set([
  'Amount',
  'ConfirmedAmount',
  'DepositAmount',
  'DepositRefundedAmount',
  'ElectricityAmount',
  'ElectricityUnitPrice',
  'PaidAmount',
  'RentAmount',
  'RentPrice',
  'ReportedAmount',
  'ServiceFeeAmount',
  'TotalAmount',
  'WaterAmount',
  'WaterUnitPrice',
])

const METER_FIELDS = new Set([
  'CurrentElectricityIndex',
  'CurrentWaterIndex',
  'InitialElectricityIndex',
  'InitialWaterIndex',
  'PreviousElectricityIndex',
  'PreviousWaterIndex',
])

const DATE_FIELDS = new Set([
  'DepositReceivedAt',
  'DepositRefundedAt',
  'DueDate',
  'PeriodEnd',
  'PeriodStart',
  'SentAt',
  'TerminatedAt',
])

// `Role` lưu tên vai trò, `CancelledBy` lưu bên hủy: cùng hai giá trị.
const PARTY_LABELS: Record<string, string> = { Tenant: 'Người thuê', Landlord: 'Chủ trọ' }

const INVOICE_LINE_CATEGORY_LABELS: Record<string, string> = {
  CongNoKyTruoc: 'Công nợ kỳ trước',
  BoiThuongHuHong: 'Bồi thường hư hỏng',
  PhiPhat: 'Phí phạt',
  KhauTruTienCoc: 'Khấu trừ tiền cọc',
  DieuChinhKhac: 'Điều chỉnh khác',
}

// `Status` là trạng thái của chính đối tượng trong nhật ký, nên nhãn tùy loại đối tượng.
const STATUS_KIND_BY_ENTITY_TYPE: Record<string, StatusKind | undefined> = {
  Contract: 'contract',
  Invoice: 'invoice',
  LandlordApplication: 'landlordApplication',
}

type JsonRecord = Record<string, AuditLogJsonValue>

function isRecord(value: AuditLogJsonValue | undefined): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getLabel(code: string, labels: Record<string, string>): string {
  return Object.hasOwn(labels, code) ? labels[code] : code
}

function formatText(field: string, value: string, entityType: string): string {
  if (DATE_FIELDS.has(field)) {
    return (/^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDate(value) : formatDateTime(value)) || value
  }
  if (field === 'Status') {
    const kind = Object.hasOwn(STATUS_KIND_BY_ENTITY_TYPE, entityType)
      ? STATUS_KIND_BY_ENTITY_TYPE[entityType]
      : undefined
    return kind ? getStatusDisplay(kind, value).label : value
  }
  if (field === 'InvoiceStatus') return getStatusDisplay('invoice', value).label
  if (field === 'RoomStatus') return getStatusDisplay('roomOccupancy', value).label
  if (field === 'Role' || field === 'CancelledBy') return getLabel(value, PARTY_LABELS)
  if (field === 'Category') return getLabel(value, INVOICE_LINE_CATEGORY_LABELS)
  if (field === 'DepositReceivedMethod' || field === 'DepositRefundMethod') {
    return value === 'TienMat' || value === 'ChuyenKhoan' ? getPaymentMethodLabel(value) : value
  }
  return value
}

function formatScalar(field: string, value: string | number | boolean | null, entityType: string): string {
  if (value === null || value === '') return EMPTY_VALUE
  if (typeof value === 'boolean') return value ? 'Có' : 'Không'
  if (typeof value === 'string') return formatText(field, value, entityType)
  if (MONEY_FIELDS.has(field)) return formatCurrency(value)
  if (METER_FIELDS.has(field)) return formatMeterIndex(value)
  return String(value)
}

/** Một đối tượng con (khoản phí, dòng hóa đơn) thành một dòng chữ; bỏ các trường trống. */
function formatRecord(record: JsonRecord, entityType: string): string {
  return Object.entries(record)
    .filter(([, value]) => value !== null && value !== '')
    .map(([field, value]) => `${getLabel(field, FIELD_LABELS)}: ${formatValue(field, value, entityType).join(', ')}`)
    .join(' · ')
}

/** Giá trị một trường thành các dòng chữ để hiện trong ô; mảng thì mỗi phần tử một dòng. */
function formatValue(field: string, value: AuditLogJsonValue | undefined, entityType: string): string[] {
  if (value === undefined) return [EMPTY_VALUE]
  if (isRecord(value)) return [formatRecord(value, entityType)]
  if (Array.isArray(value)) {
    return value.length === 0 ? [EMPTY_VALUE] : value.flatMap((item) => formatValue(field, item, entityType))
  }
  return [formatScalar(field, value, entityType)]
}

/**
 * Dựng bảng so sánh trước – sau từ `oldValue`, `newValue` của một dòng nhật ký (AD4): mỗi trường có ở
 * một trong hai vế là một dòng, dòng đã đổi xếp trước vì đó là điều người tra cứu cần thấy (cột `jsonb`
 * không giữ thứ tự trường lúc ghi). Kết quả chỉ là chữ, trang hiển thị qua JSX nên mọi giá trị đều được
 * React thoát ký tự (security-design mục 8, quy tắc 15).
 */
export function buildAuditLogChanges(
  oldValue: AuditLogJsonValue | null,
  newValue: AuditLogJsonValue | null,
  entityType: string,
): AuditLogChange[] {
  const before: JsonRecord = isRecord(oldValue) ? oldValue : {}
  const after: JsonRecord = isRecord(newValue) ? newValue : {}
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])]

  const changes = fields.map((field) => ({
    field,
    label: getLabel(field, FIELD_LABELS),
    before: formatValue(field, before[field], entityType),
    after: formatValue(field, after[field], entityType),
    changed: JSON.stringify(before[field]) !== JSON.stringify(after[field]),
  }))
  return [...changes.filter((change) => change.changed), ...changes.filter((change) => !change.changed)]
}
