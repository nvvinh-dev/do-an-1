import { useMatches } from 'react-router'
import landlordApartmentFacade from '@/assets/landlord-apartment-facade.jpg'

/** Khai báo trong `handle` của route: ảnh nền mờ của màn hình (đường dẫn ảnh đã import từ `src/assets`). */
export interface ScreenHandle {
  background?: string
}

/** Trang không thuộc nhóm nào (404, lỗi) dùng ảnh mặt tiền tòa nhà. */
const DEFAULT_BACKGROUND = landlordApartmentFacade

/**
 * Nền ẩn của mọi màn hình (docs/design-system.md mục 2): ảnh của chính màn đang mở, cố định phía sau trang,
 * phủ lớp màu nền dày 70% ở đầu trang tăng dần tới 95% ở đáy nên chỉ còn bóng mờ. Thanh trên, thẻ, bảng, ô nhập
 * vẫn trắng đặc đè lên; khung có sidebar để vùng nội dung trong suốt (components/ui/sidebar.tsx) cho lớp này hiện ra.
 * Ảnh lấy từ route sâu nhất có khai báo `handle.background`; đổi trang thì ảnh mới hiện dần lên.
 */
export default function ScreenBackground() {
  const matches = useMatches()
  const match = [...matches].reverse().find((m) => (m.handle as ScreenHandle | undefined)?.background)
  const src = (match?.handle as ScreenHandle | undefined)?.background ?? DEFAULT_BACKGROUND

  return (
    <div
      key={src}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center animate-in duration-500 fade-in"
      style={{
        backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, var(--background) 70%, transparent), color-mix(in srgb, var(--background) 85%, transparent) 55%, color-mix(in srgb, var(--background) 95%, transparent)), url(${src})`,
      }}
    />
  )
}
