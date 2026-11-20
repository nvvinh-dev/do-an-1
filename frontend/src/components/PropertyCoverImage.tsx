import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const aspectClasses = {
  /** Thẻ khu trọ (L1, L2). */
  wide: 'aspect-video',
  /** Thẻ phòng (P1). */
  photo: 'aspect-[4/3]',
  /** Ảnh nhỏ cạnh tên khu trọ trong danh sách; cỡ do `className` quyết định. */
  square: 'aspect-square',
} as const

// Khung ảnh thiếu: sọc chéo nhạt giữa màu vùng lõm và màu nền trang (docs/design-system.md mục 6.2).
const missingBackground = 'repeating-linear-gradient(135deg, var(--muted) 0 12px, var(--background) 12px 24px)'

interface PropertyCoverImageProps {
  /** URL ảnh; `null` thì hiện khung ảnh thiếu. */
  src: string | null
  alt: string
  aspect: keyof typeof aspectClasses
  /** Câu hiện trong khung ảnh thiếu. Ảnh `square` quá nhỏ nên chỉ đọc cho trình đọc màn hình. */
  missingText: string
  className?: string
}

/** Ảnh đại diện của khu trọ hoặc phòng, có khung rõ ràng khi chưa có ảnh (docs/design-system.md mục 6.2, 11). */
export default function PropertyCoverImage({ src, alt, aspect, missingText, className }: PropertyCoverImageProps) {
  if (src === null) {
    const compact = aspect === 'square'
    return (
      <div
        className={cn(
          'flex w-full flex-col items-center justify-center gap-1.5 text-muted-foreground',
          aspectClasses[aspect],
          className,
        )}
        style={{ backgroundImage: missingBackground }}
      >
        <ImageOff aria-hidden="true" className={compact ? 'size-5' : 'size-7'} strokeWidth={1.75} />
        <span className={compact ? 'sr-only' : 'px-3 text-center text-sm font-medium'}>{missingText}</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cn('w-full bg-muted object-cover', aspectClasses[aspect], className)}
    />
  )
}
