import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  /** Dòng mô tả ngắn dưới tiêu đề. */
  description?: string
  /** Nút chính của trang. Dùng `Button size="page"`: rộng hết hàng trên điện thoại, vừa chữ từ `md`. */
  action?: ReactNode
  className?: string
}

/** Đầu mỗi trang: tiêu đề, mô tả ngắn và nút chính (docs/design-system.md mục 5 và 6.2). */
export default function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-col gap-4 md:flex-row md:items-start md:justify-between', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="md:shrink-0">{action}</div>}
    </header>
  )
}
