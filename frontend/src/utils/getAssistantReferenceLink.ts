import type { AssistantReference } from '@/types/assistantTypes'
import type { UserRole } from '@/types/authTypes'

export interface AssistantReferenceLink {
  label: string
  to: string
}

const TYPE_LABELS: Record<AssistantReference['type'], string> = {
  Contract: 'Hợp đồng',
  Invoice: 'Hóa đơn',
  Room: 'Phòng',
  MaintenanceRequest: 'Sự cố',
}

/**
 * Liên kết của một bản ghi câu trả lời trợ lý nhắc tới (docs/frontend-screens.md mục 1): hợp đồng, hóa đơn, sự
 * cố mở trang chi tiết của vai trò đang đăng nhập như S2; phòng chỉ có trang L3 của Chủ trọ. `null` thì không
 * hiện liên kết: Admin chỉ hỏi cách dùng hệ thống nên không có bản ghi, Người thuê không có trang phòng riêng.
 */
export function getAssistantReferenceLink(reference: AssistantReference, role: UserRole): AssistantReferenceLink | null {
  if (role === 'Admin') {
    return null
  }

  const rolePath = role === 'Tenant' ? '/tenant' : '/landlord'
  const label = `${TYPE_LABELS[reference.type]} #${reference.id}`

  switch (reference.type) {
    case 'Contract':
      return { label, to: `${rolePath}/contracts/${reference.id}` }
    case 'Invoice':
      return { label, to: `${rolePath}/invoices/${reference.id}` }
    case 'MaintenanceRequest':
      return { label, to: `${rolePath}/maintenance-requests/${reference.id}` }
    case 'Room':
      return role === 'Landlord' ? { label, to: `/landlord/rooms/${reference.id}` } : null
    default:
      return null
  }
}
