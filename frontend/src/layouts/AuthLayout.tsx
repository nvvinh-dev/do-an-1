import { Outlet } from 'react-router'
import authStudioRoom from '@/assets/auth-studio-room.jpg'

/**
 * Khung của bốn màn xác thực (đăng nhập, đăng ký, quên và đặt lại mật khẩu), đặt trong `PublicLayout`.
 * Từ `lg` ảnh phòng nằm bên trái form; dưới `lg` ẩn ảnh để form vẫn gọn từ màn hình 360px
 * (docs/design-system.md mục 5).
 */
export default function AuthLayout() {
  return (
    <div className="grid items-stretch lg:grid-cols-2 lg:gap-8">
      <div aria-hidden="true" className="relative my-4 hidden overflow-hidden rounded-xl lg:block">
        <img
          src={authStudioRoom}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover object-[30%_60%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/65 via-transparent to-transparent" />
        <p className="absolute right-6 bottom-6 left-6 text-lg font-semibold text-primary-foreground">
          Quản lý phòng trọ, hợp đồng và hóa đơn ở một nơi.
        </p>
      </div>
      <Outlet />
    </div>
  )
}
