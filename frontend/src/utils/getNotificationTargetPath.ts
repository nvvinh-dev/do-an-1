import type { UserRole } from '@/types/authTypes'
import type { NotificationListItem } from '@/types/notificationTypes'

/**
 * Trang mở ra khi bấm một thông báo ở S2, theo `relatedEntityType` và vai trò đang đăng nhập
 * (docs/frontend-screens.md mục 4, sơ đồ 8.2 và 8.3). Vai trò lấy từ phiên hiện tại, không lấy
 * vai trò lúc thông báo được gửi: hồ sơ Chủ trọ được duyệt thì người nộp đã là Chủ trọ, mà T2 chỉ
 * mở cho Người thuê, nên Chủ trọ về Tổng quan.
 *
 * `null` thì chỉ đánh dấu đã đọc, ở lại trang: thông báo không gắn bản ghi, Admin (không có màn
 * Thông báo), lời mời ở ghép (trang T9 thuộc Phase 2, chưa có).
 */
export function getNotificationTargetPath(
  notification: Pick<NotificationListItem, 'relatedEntityType' | 'relatedEntityId'>,
  role: UserRole,
): string | null {
  if (role === 'Admin') {
    return null
  }

  const { relatedEntityType, relatedEntityId } = notification
  const rolePath = role === 'Tenant' ? '/tenant' : '/landlord'

  switch (relatedEntityType) {
    case 'AppUser':
      return '/account'
    case 'LandlordApplication':
      return role === 'Tenant' ? '/tenant/landlord-application' : '/landlord'
    case 'Contract':
      return relatedEntityId === null ? null : `${rolePath}/contracts/${relatedEntityId}`
    case 'Invoice':
      return relatedEntityId === null ? null : `${rolePath}/invoices/${relatedEntityId}`
    case 'RentalRequest':
      return relatedEntityId === null ? null : `${rolePath}/rental-requests/${relatedEntityId}`
    default:
      return null
  }
}
