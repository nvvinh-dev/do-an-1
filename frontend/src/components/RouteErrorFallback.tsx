import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getRoleHomePath } from '@/utils/getRoleHomePath'

/**
 * `errorElement` của nhóm route: hiện thay cho trang khi trang đó ném lỗi lúc vẽ (dữ liệu trả về
 * thiếu trường, lỗi chưa lường trước), để màn hình không trắng hay hiện trang lỗi tiếng Anh mặc
 * định của React Router. Lỗi của lời gọi API không tới đây: trang tự hiện bằng `ApiErrorAlert`.
 * Không hiện nội dung lỗi vì đó là chữ dành cho lập trình viên; React đã ghi lỗi ra console.
 * Chuyển sang trang khác (menu, nút về trang chủ) thì React Router bỏ lỗi và vẽ trang mới như bình thường.
 */
export default function RouteErrorFallback() {
  const { data: user } = useCurrentUser()
  const homePath = user ? getRoleHomePath(user.roles) : '/'

  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Trang gặp lỗi khi hiển thị</h1>
      <p className="text-muted-foreground">
        Tải lại trang để thử lại. Lỗi vẫn còn thì về trang chủ rồi mở lại từ menu.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={() => window.location.reload()}>
          Tải lại trang
        </Button>
        <Button asChild variant="outline">
          <Link to={homePath}>Về trang chủ</Link>
        </Button>
      </div>
    </section>
  )
}
