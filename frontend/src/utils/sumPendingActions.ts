import type { LandlordPendingActions, TenantPendingActions } from '@/types/dashboardTypes'

/**
 * Tổng số việc cần xử lý cho câu chào "Hôm nay có N việc cần bạn xử lý" (docs/frontend-screens.md mục 6). Cộng mọi
 * trường của `pendingActions` để thêm số đếm mới ở API là tổng tự đúng.
 */
export function sumPendingActions(pendingActions: LandlordPendingActions | TenantPendingActions): number {
  return Object.values(pendingActions).reduce((sum: number, count: number) => sum + count, 0)
}
