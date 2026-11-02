/** Trạng thái hồ sơ đăng ký Chủ trọ (docs/database-design.md mục 3, vòng đời ở tài liệu phân tích mục 8.8). */
export const LANDLORD_APPLICATION_STATUSES = ['ChoDuyet', 'DaDuyet', 'TuChoi', 'DaThuHoi'] as const

export type LandlordApplicationStatus = (typeof LANDLORD_APPLICATION_STATUSES)[number]

/**
 * Response của `POST /landlord-applications` và `GET /landlord-applications/me` (docs/api-design.md
 * mục 3). Không có số CCCD và ảnh giấy tờ: chỉ Admin xem được trong lúc duyệt (FR-10).
 */
export interface LandlordApplication {
  id: number
  status: LandlordApplicationStatus
  submittedAt: string
  reviewedAt: string | null
  rejectReason: string | null
}

/**
 * Body của `POST /landlord-applications` (docs/api-design.md mục 3). Ba đường dẫn là `path` nhận
 * từ `POST /files` với `purpose = GiayToNhanThan`.
 */
export interface SubmitLandlordApplicationRequest {
  idCardNumber: string
  idCardFrontPath: string
  idCardBackPath: string
  ownershipDocumentPath: string
}

/** Query của `GET /admin/landlord-applications`; bỏ trống thì server dùng mặc định. */
export interface LandlordApplicationListParams {
  status?: LandlordApplicationStatus
  page?: number
}

/** Một dòng của `GET /admin/landlord-applications`, mới nộp trước. Không có giấy tờ. */
export interface LandlordApplicationListItem {
  id: number
  userId: number
  applicantFullName: string
  applicantEmail: string
  status: LandlordApplicationStatus
  submittedAt: string
}

/**
 * Response của `GET /admin/landlord-applications/{id}` — nơi duy nhất có số CCCD và ảnh giấy tờ
 * (FR-10). Ba `...Url` là URL có chữ ký, hết hạn sau 15 phút: chỉ dùng để hiện ngay, không lưu lại.
 */
export interface LandlordApplicationDetail {
  id: number
  userId: number
  applicantFullName: string
  applicantEmail: string
  /** Số hiện tại của người nộp, Admin gọi số này để xác minh trước khi duyệt (BR-01). */
  applicantPhoneNumber: string | null
  idCardNumber: string
  idCardFrontUrl: string
  idCardBackUrl: string
  ownershipDocumentUrl: string
  status: LandlordApplicationStatus
  submittedAt: string
  reviewedAt: string | null
  rejectReason: string | null
}

/** Body của `POST /admin/landlord-applications/{id}/approve`: số Admin đã gọi xác minh. */
export interface ApproveLandlordApplicationRequest {
  verifiedPhoneNumber: string
}

/** Body của `POST /admin/landlord-applications/{id}/reject`; lý do bắt buộc (FR-08). */
export interface RejectLandlordApplicationRequest {
  reason: string
}
