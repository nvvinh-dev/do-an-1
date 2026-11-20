import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FactListProps {
  children: ReactNode
  /** Nhãn nằm trên giá trị, dùng ở cột phụ hẹp; mặc định nhãn bên trái từ `md`. */
  stacked?: boolean
  className?: string
}

/**
 * Danh sách cặp nhãn – giá trị cho thông tin tĩnh của trang chi tiết (docs/design-system.md mục 6.2).
 * Các `Fact` là con trực tiếp, thay cho `dl` tự viết lặp lại ở từng trang.
 */
export function FactList({ children, stacked = false, className }: FactListProps) {
  return (
    <dl
      className={cn(
        'grid text-sm',
        stacked ? 'gap-y-1 [&>dt:not(:first-child)]:mt-3' : 'gap-4 md:grid-cols-[12rem_1fr]',
        className,
      )}
    >
      {children}
    </dl>
  )
}

interface FactProps {
  label: string
  children: ReactNode
}

/** Một cặp nhãn – giá trị: nhãn màu phụ, giá trị `font-medium`, dài thì tự xuống dòng. */
export function Fact({ label, children }: FactProps) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium wrap-anywhere">{children}</dd>
    </>
  )
}
