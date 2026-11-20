import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FactListProps {
  /** Các `Fact`, hoặc cặp `dt`/`dd` viết thẳng; cả hai được tô kiểu như nhau. */
  children: ReactNode
  /** Nhãn nằm trên giá trị, dùng ở cột phụ hẹp; mặc định nhãn bên trái từ `md`. */
  stacked?: boolean
  className?: string
}

/**
 * Danh sách cặp nhãn – giá trị cho thông tin tĩnh của trang chi tiết (docs/design-system.md mục 6.2):
 * nhãn màu phụ, giá trị `font-medium`, dài thì tự xuống dòng. Thay cho `dl` tự viết lặp lại ở từng trang.
 */
export function FactList({ children, stacked = false, className }: FactListProps) {
  return (
    <dl
      className={cn(
        'grid text-sm [&>dd]:font-medium [&>dd]:wrap-anywhere [&>dt]:text-muted-foreground',
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

/** Một cặp nhãn – giá trị. */
export function Fact({ label, children }: FactProps) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  )
}
