import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  /** Dòng mô tả ngắn dưới tiêu đề. */
  description?: string
  /** Nút chính của trang. Dùng `Button size="page"`: rộng hết hàng trên điện thoại, vừa chữ từ `md`. */
  action?: ReactNode
  /** Ảnh nền của dải đầu trang (đường dẫn ảnh đã import từ `src/assets`). Có ảnh thì tiêu đề hiện chữ trắng trên lớp phủ tối. */
  image?: string
  /** Vị trí cắt ảnh nền, theo `background-position` của CSS. Mặc định lấy giữa ảnh. */
  imagePosition?: string
  /**
   * Ngày hôm nay (`utils/formatGreetingDate.ts`). Có giá trị thì đầu trang là lời chào của dashboard:
   * dòng ngày nhỏ trên tiêu đề, không nền, không ảnh.
   */
  greeting?: string
  className?: string
}

/** Đầu mỗi trang: tiêu đề, mô tả ngắn và nút chính (docs/design-system.md mục 3, 5 và 6.2). */
export default function PageHeader({ title, description, action, image, imagePosition, greeting, className }: PageHeaderProps) {
  const hasImage = Boolean(image) && !greeting

  return (
    <header
      className={cn(
        'flex flex-col gap-4 md:flex-row md:justify-between',
        greeting ? 'md:items-end' : 'md:items-start',
        // Dải ảnh: lớp phủ tối đều để chữ trắng đủ tương phản trên mọi phần của ảnh.
        hasImage &&
          'relative overflow-hidden rounded-xl bg-cover px-5 py-6 text-primary-foreground md:items-center md:px-8 md:py-9',
        className
      )}
      style={hasImage ? { backgroundImage: `url(${image})`, backgroundPosition: imagePosition ?? 'center' } : undefined}
    >
      {hasImage && (
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-foreground/75 via-foreground/55 to-foreground/25" />
      )}
      <div className={cn('flex min-w-0 flex-col gap-1', hasImage && 'relative')}>
        {greeting && <p className="text-sm font-medium text-muted-foreground">{greeting}</p>}
        {/* `wrap-anywhere`: tiêu đề và mô tả có thể chứa chuỗi dài không có chỗ ngắt (mã phòng tới 50 ký tự ở L3,
            email ở A4), không để tràn ngang ở 360px. */}
        <h1 className="text-2xl font-bold tracking-tight wrap-anywhere">{title}</h1>
        {description && (
          <p className={cn('text-sm wrap-anywhere', hasImage ? 'text-primary-foreground/90' : 'text-muted-foreground')}>
            {description}
          </p>
        )}
      </div>
      {action && <div className={cn('md:shrink-0', hasImage && 'relative')}>{action}</div>}
    </header>
  )
}
