import {
  Bell,
  BadgeCheck,
  CircleUser,
  FileSignature,
  KeyRound,
  ReceiptText,
  UsersRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { NotificationRelatedEntityType } from '@/types/notificationTypes'
import type { NavTint } from '@/utils/tintClasses'

export interface NotificationEntityStyle {
  icon: LucideIcon
  tint: NavTint
}

/**
 * Icon và sắc của ô icon ở một dòng thông báo, theo loại bản ghi liên quan. Cùng icon và sắc với mục
 * menu tương ứng để người dùng gắn thông báo với mục (docs/design-system.md mục 4).
 */
export function getNotificationEntityStyle(
  relatedEntityType: NotificationRelatedEntityType | null,
): NotificationEntityStyle {
  switch (relatedEntityType) {
    case 'Contract':
      return { icon: FileSignature, tint: 'indigo' }
    case 'Invoice':
      return { icon: ReceiptText, tint: 'amber' }
    case 'RentalRequest':
      return { icon: KeyRound, tint: 'violet' }
    case 'LandlordApplication':
      return { icon: BadgeCheck, tint: 'emerald' }
    case 'MaintenanceRequest':
      return { icon: Wrench, tint: 'rose' }
    case 'AppUser':
      return { icon: CircleUser, tint: 'slate' }
    case 'RoommateInvitation':
      return { icon: UsersRound, tint: 'violet' }
    default:
      return { icon: Bell, tint: 'slate' }
  }
}
