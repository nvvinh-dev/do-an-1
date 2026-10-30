/** Loại bản ghi gắn với thông báo (docs/database-design.md mục 7.1). `RoommateInvitation` từ Phase 2. */
export type NotificationRelatedEntityType =
  | 'Contract'
  | 'Invoice'
  | 'RentalRequest'
  | 'LandlordApplication'
  | 'AppUser'
  | 'RoommateInvitation'

/** Một dòng của `GET /notifications` (docs/api-design.md mục 11). */
export interface NotificationListItem {
  id: number
  /** Mã sự kiện theo danh mục ở docs/database-design.md mục 7.3. */
  eventType: string
  title: string
  content: string
  relatedEntityType: NotificationRelatedEntityType | null
  relatedEntityId: number | null
  isRead: boolean
  createdAt: string
}

/** Query của `GET /notifications`: bỏ `isRead` thì lấy cả đã đọc lẫn chưa đọc. */
export interface NotificationListParams {
  isRead?: boolean
  page?: number
}

/** Response của `GET /notifications/unread-count` (docs/api-design.md mục 11). */
export interface UnreadNotificationCount {
  count: number
}
