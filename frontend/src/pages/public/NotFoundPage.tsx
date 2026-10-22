import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getRoleHomePath } from '@/utils/getRoleHomePath'

/**
 * P3 — đường dẫn không khớp route nào, hoặc API trả 404 vì tài nguyên không tồn tại
 * hay không thuộc người gọi (docs/frontend-screens.md mục 1). Lời nhắn không phân biệt
 * hai trường hợp để không lộ tài nguyên nào có thật.
 */
export default function NotFoundPage() {
  const { data: user } = useCurrentUser()
  const homePath = user ? getRoleHomePath(user.roles) : '/'

  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <p className="text-sm font-semibold text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">Không tìm thấy trang</h1>
      <p className="text-muted-foreground">
        Đường dẫn không tồn tại, hoặc bạn không xem được nội dung này.
      </p>
      <Button asChild className="mt-3">
        <Link to={homePath}>Về trang chủ</Link>
      </Button>
    </section>
  )
}
