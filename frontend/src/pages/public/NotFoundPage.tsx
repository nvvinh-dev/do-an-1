import { Link } from 'react-router'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { getRoleHomePath } from '../../utils/getRoleHomePath'

/**
 * P3 — đường dẫn không khớp route nào, hoặc API trả 404 vì tài nguyên không tồn tại
 * hay không thuộc người gọi (docs/frontend-screens.md mục 1). Lời nhắn không phân biệt
 * hai trường hợp để không lộ tài nguyên nào có thật.
 */
export default function NotFoundPage() {
  const { data: user } = useCurrentUser()
  const homePath = user ? getRoleHomePath(user.roles) : '/'

  return (
    <section className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-sm font-semibold text-slate-500">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Không tìm thấy trang</h1>
      <p className="mt-3 text-slate-600">
        Đường dẫn không tồn tại, hoặc bạn không xem được nội dung này.
      </p>
      <Link
        to={homePath}
        className="mt-6 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        Về trang chủ
      </Link>
    </section>
  )
}
