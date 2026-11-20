import { Outlet, useLocation } from 'react-router'
import authPasswordLocks from '@/assets/auth-password-locks.png'
import authRegisterLivingRoom from '@/assets/auth-register-living-room.jpg'
import authStudioRoom from '@/assets/auth-studio-room.jpg'

interface AuthSidePicture {
  src: string
  position: string
  caption: string
}

/** Ảnh và câu giới thiệu bên cạnh form: đăng ký (A2) và hai màn mật khẩu (A3, A4) mỗi nhóm một ảnh riêng, đăng nhập (A1) dùng ảnh phòng studio. */
const REGISTER_PICTURE: AuthSidePicture = {
  src: authRegisterLivingRoom,
  position: '50% 60%',
  caption: 'Tạo tài khoản để tìm phòng hoặc quản lý khu trọ của bạn.',
}
/** Quên mật khẩu (A3) và đặt lại mật khẩu (A4) dùng chung một ảnh ổ khóa; cắt lấy ổ khóa đang mở. */
const PASSWORD_PICTURE: AuthSidePicture = {
  src: authPasswordLocks,
  position: '64% 50%',
  caption: 'Lấy lại quyền truy cập tài khoản của bạn.',
}
const DEFAULT_PICTURE: AuthSidePicture = {
  src: authStudioRoom,
  position: '30% 60%',
  caption: 'Quản lý phòng trọ, hợp đồng và hóa đơn ở một nơi.',
}

/**
 * Khung của bốn màn xác thực (đăng nhập, đăng ký, quên và đặt lại mật khẩu), đặt trong `PublicLayout`.
 * Từ `lg` ảnh nằm bên trái, form trong `AuthCard` căn giữa theo chiều dọc; dưới `lg` ẩn ảnh để form vẫn gọn từ màn hình 360px
 * (docs/design-system.md mục 5).
 */
export default function AuthLayout() {
  const { pathname } = useLocation()
  const picture =
    pathname === '/register'
      ? REGISTER_PICTURE
      : pathname === '/forgot-password' || pathname === '/reset-password'
        ? PASSWORD_PICTURE
        : DEFAULT_PICTURE

  return (
    <div className="grid items-stretch lg:grid-cols-2 lg:gap-8">
      <div aria-hidden="true" className="relative my-4 hidden overflow-hidden rounded-xl lg:block">
        <img
          src={picture.src}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
          style={{ objectPosition: picture.position }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent" />
        <p className="absolute right-6 bottom-6 left-6 text-lg font-semibold text-primary-foreground">{picture.caption}</p>
      </div>
      <div className="flex items-center">
        <Outlet />
      </div>
    </div>
  )
}
