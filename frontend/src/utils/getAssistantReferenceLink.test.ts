import { describe, expect, it } from 'vitest'
import { getAssistantReferenceLink } from '@/utils/getAssistantReferenceLink'

describe('getAssistantReferenceLink', () => {
  it('Người thuê: hợp đồng, hóa đơn, sự cố mở trang chi tiết của Người thuê', () => {
    expect(getAssistantReferenceLink({ type: 'Contract', id: 12 }, 'Tenant')).toEqual({
      label: 'Hợp đồng #12',
      to: '/tenant/contracts/12',
    })
    expect(getAssistantReferenceLink({ type: 'Invoice', id: 5 }, 'Tenant')).toEqual({
      label: 'Hóa đơn #5',
      to: '/tenant/invoices/5',
    })
    expect(getAssistantReferenceLink({ type: 'MaintenanceRequest', id: 9 }, 'Tenant')).toEqual({
      label: 'Sự cố #9',
      to: '/tenant/maintenance-requests/9',
    })
  })

  it('Người thuê: phòng không có liên kết', () => {
    expect(getAssistantReferenceLink({ type: 'Room', id: 3 }, 'Tenant')).toBeNull()
  })

  it('Chủ trọ: phòng mở L3, các loại còn lại mở trang chi tiết của Chủ trọ', () => {
    expect(getAssistantReferenceLink({ type: 'Room', id: 3 }, 'Landlord')).toEqual({
      label: 'Phòng #3',
      to: '/landlord/rooms/3',
    })
    expect(getAssistantReferenceLink({ type: 'Contract', id: 12 }, 'Landlord')?.to).toBe('/landlord/contracts/12')
    expect(getAssistantReferenceLink({ type: 'Invoice', id: 5 }, 'Landlord')?.to).toBe('/landlord/invoices/5')
    expect(getAssistantReferenceLink({ type: 'MaintenanceRequest', id: 9 }, 'Landlord')?.to).toBe(
      '/landlord/maintenance-requests/9',
    )
  })

  it('Admin: không có liên kết', () => {
    expect(getAssistantReferenceLink({ type: 'Contract', id: 12 }, 'Admin')).toBeNull()
    expect(getAssistantReferenceLink({ type: 'Room', id: 3 }, 'Admin')).toBeNull()
  })
})
