import PropertyCoverImage from '@/components/PropertyCoverImage'
import { Badge } from '@/components/ui/badge'

interface PhotoGridProps {
  /** Ảnh theo thứ tự Chủ trọ sắp; ảnh đầu là ảnh đại diện. */
  images: { path: string; url: string }[]
  /** Đầu chữ `alt`, ví dụ "Ảnh phòng P101" thành "Ảnh phòng P101, ảnh 2" (docs/design-system.md mục 9). */
  altPrefix: string
  /** Câu trong khung ảnh thiếu khi chưa có ảnh nào. */
  missingText: string
}

/**
 * Ảnh của phòng hoặc khu trọ ở trang quản lý (L3, chi tiết khu trọ): ảnh đại diện lớn chiếm hai cột hai
 * hàng, các ảnh sau là ô nhỏ; chưa có ảnh thì hiện khung ảnh thiếu (docs/design-system.md mục 6.2, 11).
 */
export default function PhotoGrid({ images, altPrefix, missingText }: PhotoGridProps) {
  if (images.length === 0) {
    return (
      <PropertyCoverImage src={null} alt="" aspect="wide" missingText={missingText} className="rounded-lg md:max-w-md" />
    )
  }

  return (
    <ul className="grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-3">
      {images.map((image, index) => (
        <li key={image.path} className={index === 0 ? 'relative col-span-2 row-span-2' : 'relative'}>
          <PropertyCoverImage
            src={image.url}
            alt={`${altPrefix}, ảnh ${index + 1}`}
            aspect="photo"
            missingText=""
            className="h-full rounded-lg"
          />
          {index === 0 && (
            <Badge variant="secondary" className="absolute top-2 left-2">
              Ảnh đại diện
            </Badge>
          )}
        </li>
      ))}
    </ul>
  )
}
