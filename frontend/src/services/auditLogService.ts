import { api } from '@/lib/api'
import type { AuditLog, AuditLogListParams } from '@/types/auditLogTypes'
import type { PagedResponse } from '@/types/paginationTypes'

// Chỉ Admin gọi được (AD4); nhật ký chỉ có thao tác đọc (docs/api-design.md mục 13).
export async function getAuditLogs(params: AuditLogListParams): Promise<PagedResponse<AuditLog>> {
  const response = await api.get<PagedResponse<AuditLog>>('/admin/audit-logs', { params })
  return response.data
}
