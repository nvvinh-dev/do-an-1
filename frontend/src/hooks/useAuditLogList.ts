import { useQuery } from '@tanstack/react-query'
import { getAuditLogs } from '@/services/auditLogService'
import type { AuditLogListParams } from '@/types/auditLogTypes'

/** Nhật ký hệ thống cho Admin (AD4), mới nhất trước. */
export function useAuditLogList(params: AuditLogListParams) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', 'list', params],
    queryFn: () => getAuditLogs(params),
  })
}
