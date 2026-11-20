import type { ReactNode } from 'react'

interface DetailLayoutProps {
  /** Cột phụ: số tiền, thời hạn, người liên quan. Dưới `xl` xếp sau cột chính. */
  aside?: ReactNode
  /** Cột chính: việc cần làm, thông tin, lịch sử. */
  children: ReactNode
}

/**
 * Bố cục thân trang chi tiết (docs/design-system.md mục 5): từ `xl` hai cột, cột phụ rộng 20rem bám theo
 * cột chính; dưới `xl` một cột, cột chính rồi cột phụ. Mốc `xl` giống dashboard vì sidebar chiếm 256px.
 */
export default function DetailLayout({ aside, children }: DetailLayoutProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
      {aside && <aside className="flex min-w-0 flex-col gap-6">{aside}</aside>}
    </div>
  )
}
