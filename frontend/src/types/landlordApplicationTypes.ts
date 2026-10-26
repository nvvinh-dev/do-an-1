/** Trạng thái hồ sơ đăng ký Chủ trọ (docs/database-design.md mục 3, vòng đời ở tài liệu phân tích mục 8.8). */
export type LandlordApplicationStatus = 'ChoDuyet' | 'DaDuyet' | 'TuChoi' | 'DaThuHoi'

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
