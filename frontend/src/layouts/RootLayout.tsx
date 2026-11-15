import { Outlet, ScrollRestoration } from 'react-router'

/**
 * Route gốc bọc mọi layout. `ScrollRestoration` đưa trang mới về đầu khi chuyển trang (mở P2 từ một
 * thẻ phòng ở cuối P1), còn bấm quay lại thì về đúng vị trí đã cuộn. Mọi layout đều cuộn bằng cửa sổ
 * trình duyệt, nên một chỗ này đủ cho cả ứng dụng.
 */
export default function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  )
}
