import type { ReactNode } from 'react'
import { FactList } from '@/components/FactList'

interface DetailCardProps {
  title: string
  /** Các cặp `dt`/`dd` (hoặc `Fact`, `DetailRow`); bỏ trống khi không có dòng nào. */
  children?: ReactNode
  /** Câu ghi chú dưới các dòng, hoặc câu thay cho danh sách rỗng. */
  note?: string
  /** Nhãn nằm trên giá trị, cho thẻ ở cột phụ. */
  stacked?: boolean
}

/** Thẻ thông tin của trang chi tiết: tiêu đề `text-lg font-bold` và một `FactList` (docs/design-system.md mục 6.2). */
export default function DetailCard({ title, children, note, stacked = false }: DetailCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {children && <FactList stacked={stacked}>{children}</FactList>}
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
    </div>
  )
}

/** Một dòng có nhãn là chuỗi do người dùng nhập (tên phí, tên người ở cùng): nhãn tự xuống dòng khi dài. */
export function DetailRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <>
      <dt className="wrap-anywhere">{term}</dt>
      <dd>{children}</dd>
    </>
  )
}
