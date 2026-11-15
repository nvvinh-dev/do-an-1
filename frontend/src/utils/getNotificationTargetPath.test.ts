import { describe, expect, it } from 'vitest'
import type { UserRole } from '@/types/authTypes'
import type { NotificationRelatedEntityType } from '@/types/notificationTypes'
import { getNotificationTargetPath } from '@/utils/getNotificationTargetPath'

function target(
  relatedEntityType: NotificationRelatedEntityType | null,
  relatedEntityId: number | null,
  role: UserRole,
) {
  return getNotificationTargetPath({ relatedEntityType, relatedEntityId }, role)
}

describe('getNotificationTargetPath', () => {
  it('Người thuê: hợp đồng, hóa đơn, yêu cầu thuê mở trang chi tiết của Người thuê', () => {
    expect(target('Contract', 12, 'Tenant')).toBe('/tenant/contracts/12')
    expect(target('Invoice', 40, 'Tenant')).toBe('/tenant/invoices/40')
    expect(target('RentalRequest', 7, 'Tenant')).toBe('/tenant/rental-requests/7')
  })

  it('Chủ trọ: hợp đồng, hóa đơn, yêu cầu thuê mở trang chi tiết của Chủ trọ', () => {
    expect(target('Contract', 12, 'Landlord')).toBe('/landlord/contracts/12')
    expect(target('Invoice', 40, 'Landlord')).toBe('/landlord/invoices/40')
    expect(target('RentalRequest', 7, 'Landlord')).toBe('/landlord/rental-requests/7')
  })

  it('Hồ sơ Chủ trọ: Người thuê về T2, Chủ trọ (hồ sơ đã duyệt) về Tổng quan L1', () => {
    expect(target('LandlordApplication', 3, 'Tenant')).toBe('/tenant/landlord-application')
    expect(target('LandlordApplication', 3, 'Landlord')).toBe('/landlord')
  })

  it('Khóa, mở khóa tài khoản: trang tài khoản với cả hai vai trò', () => {
    expect(target('AppUser', 15, 'Tenant')).toBe('/account')
    expect(target('AppUser', 15, 'Landlord')).toBe('/account')
  })

  it('Thông báo không gắn bản ghi, hoặc thiếu id của bản ghi cần id: không chuyển trang', () => {
    expect(target(null, null, 'Tenant')).toBeNull()
    expect(target('Contract', null, 'Tenant')).toBeNull()
    expect(target('Invoice', null, 'Landlord')).toBeNull()
  })

  it('Lời mời ở ghép (Phase 2) chưa có trang T9: không chuyển trang', () => {
    expect(target('RoommateInvitation', 5, 'Tenant')).toBeNull()
  })

  it('Admin không có màn Thông báo: không chuyển trang', () => {
    expect(target('AppUser', 15, 'Admin')).toBeNull()
  })
})
