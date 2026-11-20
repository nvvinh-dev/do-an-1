import { ChevronLeft } from 'lucide-react'
import { Link, type To } from 'react-router'
import { Button } from '@/components/ui/button'

interface BackLinkProps {
  to: To
  /** Tên danh sách quay về, ví dụ "Yêu cầu thuê". */
  children: string
}

/** Liên kết quay về danh sách ở đầu trang chi tiết; hiện cả lúc đang tải và khi lỗi (docs/design-system.md mục 5). */
export default function BackLink({ to, children }: BackLinkProps) {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
      <Link to={to}>
        <ChevronLeft />
        {children}
      </Link>
    </Button>
  )
}
