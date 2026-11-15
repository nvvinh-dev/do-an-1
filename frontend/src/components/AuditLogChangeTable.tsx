import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { AuditLog } from '@/types/auditLogTypes'
import { buildAuditLogChanges } from '@/utils/buildAuditLogChanges'

/**
 * Bảng so sánh trước – sau của một dòng nhật ký (AD4). Trường đã đổi in đậm; dấu "—" là thao tác không
 * ghi trường đó ở vế này. Mọi giá trị hiện dạng chữ, không dựng HTML từ dữ liệu.
 */
export default function AuditLogChangeTable({ log }: { log: AuditLog }) {
  const changes = buildAuditLogChanges(log.oldValue, log.newValue, log.entityType)

  if (changes.length === 0) {
    return <p className="text-sm text-muted-foreground">Thao tác này không ghi giá trị trước, sau.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              {/* Cột nhãn hẹp hơn hai cột giá trị để số điện thoại không bị ngắt dòng ở 360px. */}
              <TableHead className="w-[30%] px-3">Thông tin</TableHead>
              <TableHead>Trước</TableHead>
              <TableHead className="px-3">Sau</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {changes.map((change) => (
              <TableRow key={change.field}>
                <TableCell className="px-3 py-2 align-top whitespace-normal wrap-anywhere text-muted-foreground">
                  {change.label}
                </TableCell>
                <ChangeValueCell lines={change.before} changed={change.changed} className="py-2" />
                <ChangeValueCell lines={change.after} changed={change.changed} className="px-3 py-2" />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">Dòng in đậm là thông tin đã đổi.</p>
    </div>
  )
}

interface ChangeValueCellProps {
  lines: string[]
  changed: boolean
  className: string
}

function ChangeValueCell({ lines, changed, className }: ChangeValueCellProps) {
  return (
    <TableCell className={cn('align-top whitespace-normal wrap-anywhere', changed && 'font-semibold', className)}>
      {lines.map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </TableCell>
  )
}
