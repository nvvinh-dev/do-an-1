import type { MaintenanceUrgency } from '@/types/maintenanceRequestTypes'

// Mức khẩn cấp không phải trạng thái nên ghi bằng chữ, không qua `StatusBadge` (docs/design-system.md mục 7).
const MAINTENANCE_URGENCY_LABELS: Record<MaintenanceUrgency, string> = {
  BinhThuong: 'Bình thường',
  Gap: 'Gấp',
  KhanCap: 'Khẩn cấp',
}

/** Nhãn tiếng Việt của mức khẩn cấp sự cố (T10), như `invoiceTypeLabels.ts`. */
export function getMaintenanceUrgencyLabel(urgency: MaintenanceUrgency): string {
  return MAINTENANCE_URGENCY_LABELS[urgency]
}
