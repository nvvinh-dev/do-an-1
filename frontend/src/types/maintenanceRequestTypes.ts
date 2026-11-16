/** Trạng thái sự cố, theo thứ tự trong vòng đời (tài liệu phân tích mục 8.6, docs/design-system.md mục 7). */
export const MAINTENANCE_REQUEST_STATUSES = [
  'Moi',
  'DangXuLy',
  'ChoNguoiThueXacNhan',
  'DaDong',
  'TuChoi',
  'DaHuy',
] as const

export type MaintenanceRequestStatus = (typeof MAINTENANCE_REQUEST_STATUSES)[number]

/** Mức khẩn cấp, từ nhẹ tới nặng. Chỉ để hiển thị và sắp xếp, không đổi hạn nào (FR-136). */
export const MAINTENANCE_URGENCIES = ['BinhThuong', 'Gap', 'KhanCap'] as const

export type MaintenanceUrgency = (typeof MAINTENANCE_URGENCIES)[number]

/** Body của `POST /maintenance-requests` (docs/api-design.md mục 18). */
export interface ReportMaintenanceRequestRequest {
  contractId: number
  /** 1–200 ký tự. */
  title: string
  /** 1–2000 ký tự. */
  description: string
  urgency: MaintenanceUrgency
  /** Tối đa 5 đường dẫn file `AnhSuCo`, theo thứ tự hiển thị; được rỗng. */
  imagePaths: string[]
}

/** Query của `GET /maintenance-requests`; bỏ trống thì server dùng mặc định (mới gửi trước). */
export interface MaintenanceRequestListParams {
  status?: MaintenanceRequestStatus
  page?: number
}

/** Một dòng của `GET /maintenance-requests`. */
export interface MaintenanceRequestListItem {
  id: number
  contractId: number
  roomCode: string
  propertyName: string
  title: string
  urgency: MaintenanceUrgency
  status: MaintenanceRequestStatus
  createdAt: string
  /** Ngày thuần `YYYY-MM-DD` do Chủ trọ ghi khi tiếp nhận; `null` khi chưa ghi. */
  expectedCompletionDate: string | null
}

/** Ảnh sự cố: URL có chữ ký, hết hạn sau 1 giờ (FR-138). */
export interface MaintenanceRequestImage {
  url: string
}

/** Response của `GET /maintenance-requests/{id}` và `POST /maintenance-requests`. */
export interface MaintenanceRequestDetail extends MaintenanceRequestListItem {
  tenantFullName: string
  description: string
  acceptedAt: string | null
  /** Lần báo sửa xong gần nhất; mốc 168 giờ tự đóng tính từ đây (FR-142). */
  completedAt: string | null
  /** Lý do chưa đạt gần nhất (FR-143). */
  notFixedReason: string | null
  rejectionReason: string | null
  /** Bồi thường dự kiến khi từ chối, đồng nguyên; chỉ là ghi chú (FR-141). */
  estimatedCompensation: number | null
  rejectedAt: string | null
  closedAt: string | null
  isAutoClosed: boolean
  cancelledAt: string | null
  images: MaintenanceRequestImage[]
}
