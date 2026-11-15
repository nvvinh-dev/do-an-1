/** Giá trị trong `oldValue`, `newValue` của nhật ký: JSON đúng như đã ghi (docs/api-design.md mục 13). */
export type AuditLogJsonValue =
  | string
  | number
  | boolean
  | null
  | AuditLogJsonValue[]
  | { [key: string]: AuditLogJsonValue }

export interface AuditLogActor {
  id: number
  fullName: string
  email: string | null
}

/** Một dòng của `GET /admin/audit-logs`. `action` và `entityType` là mã ở database-design mục 7.3. */
export interface AuditLog {
  id: number
  actor: AuditLogActor
  action: string
  entityType: string
  entityId: number
  oldValue: AuditLogJsonValue | null
  newValue: AuditLogJsonValue | null
  occurredAt: string
}

/** Các `entity_type` nhật ký ghi ở Phase 1 (database-design mục 7.3). */
export const AUDIT_ENTITY_TYPES = ['LandlordApplication', 'AppUser', 'Room', 'Contract', 'Invoice'] as const

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number]

/** Các `action` nhật ký ghi ở Phase 1 (database-design mục 7.3), theo thứ tự của danh mục. */
export const AUDIT_ACTIONS = [
  'DuyetHoSoChuTro',
  'TuChoiHoSoChuTro',
  'KhoaTaiKhoan',
  'MoKhoaTaiKhoan',
  'KhaiBaoTaiKhoanNhanTien',
  'SuaTaiKhoanNhanTien',
  'SuaGiaPhong',
  'SuaChiSoDau',
  'XacNhanNhanCoc',
  'GhiNhanHoanCoc',
  'TaoHoaDon',
  'SuaHoaDon',
  'HuyHoaDon',
  'XacNhanThanhToan',
  'TuChoiThanhToan',
  'TuChotBangThanhLy',
  'HoanTatThanhLy',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

/**
 * Bộ lọc của AD4 trên query của URL. `fromDate`, `toDate` là ngày theo giờ Việt Nam dạng `YYYY-MM-DD`;
 * lúc gọi API mới đổi thành thời điểm (`toAuditLogListParams`).
 */
export interface AuditLogFilters {
  entityType?: AuditEntityType
  entityId?: number
  actorUserId?: number
  action?: AuditAction
  fromDate?: string
  toDate?: string
  page: number
}

/** Query của `GET /admin/audit-logs`; `from`, `to` là thời điểm ISO 8601, tính cả hai đầu mút. */
export interface AuditLogListParams {
  entityType?: AuditEntityType
  entityId?: number
  actorUserId?: number
  action?: AuditAction
  from?: string
  to?: string
  page: number
}

/** Giá trị các ô của form lọc; ô trống là không lọc. */
export interface AuditLogFilterFormValues {
  entityType: string
  entityId: string
  actorUserId: string
  action: string
  fromDate: string
  toDate: string
}

/** Một dòng của bảng so sánh trước – sau; mỗi vế gồm một hoặc nhiều dòng chữ đã định dạng. */
export interface AuditLogChange {
  field: string
  label: string
  before: string[]
  after: string[]
  changed: boolean
}
