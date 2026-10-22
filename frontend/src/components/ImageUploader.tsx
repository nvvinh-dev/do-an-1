import { ChevronLeft, ChevronRight, ImageIcon, ImagePlus, X } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useUploadFile } from '@/hooks/useUploadFile'
import { cn } from '@/lib/utils'
import type { UploadedImage, UploadPurpose } from '@/types/fileTypes'
import { getMaxUploadBytes, validateImageFile } from '@/utils/validateImageFile'

// Tên dùng để đặt `alt` và nhãn nút, ví dụ "Ảnh phòng, ảnh 1" (docs/design-system.md mục 9).
const DEFAULT_IMAGE_LABELS: Record<UploadPurpose, string> = {
  GiayToNhanThan: 'Ảnh giấy tờ',
  AnhKhuTro: 'Ảnh khu trọ',
  AnhPhong: 'Ảnh phòng',
  AnhDongHo: 'Ảnh đồng hồ',
  MinhChungThanhToan: 'Ảnh minh chứng thanh toán',
  AnhHuHong: 'Ảnh hư hỏng',
}

interface ImageUploaderProps {
  /** Quyết định bucket, quyền và dung lượng tối đa (5 MB ảnh công khai, 10 MB file riêng tư). */
  purpose: UploadPurpose
  /** Danh sách ảnh hiện có, theo thứ tự hiển thị. Form giữ danh sách này và gửi `path` của từng ảnh. */
  value: UploadedImage[]
  onChange: (images: UploadedImage[]) => void
  /** Số ảnh tối đa do màn quyết định (khu trọ, phòng: 10). Mặc định 1. */
  maxFiles?: number
  /** Hiện nút đổi chỗ ảnh; ảnh đầu tiên là ảnh đại diện (FR-100). */
  reorderable?: boolean
  disabled?: boolean
  /** Ghi đè tên dùng cho `alt`, ví dụ "Ảnh phòng P101". */
  imageLabel?: string
  className?: string
}

/**
 * Chọn hoặc chụp ảnh, tải lên `POST /files` với đúng `purpose`, xem trước, xóa và (tùy màn) đổi
 * thứ tự (docs/design-system.md mục 6.2). Ảnh vượt dung lượng hoặc sai định dạng bị chặn ngay
 * trên máy, không gửi lên. Ảnh chỉ được tải lên Storage; việc gắn `path` vào khu trọ, phòng hay
 * hóa đơn là của request nghiệp vụ mà form gửi sau đó.
 */
export default function ImageUploader({
  purpose,
  value,
  onChange,
  maxFiles = 1,
  reorderable = false,
  disabled = false,
  imageLabel = DEFAULT_IMAGE_LABELS[purpose],
  className,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadFile()
  const [isUploading, setIsUploading] = useState(false)
  const [rejections, setRejections] = useState<string[]>([])
  // Ảnh giấy tờ không có URL xem trước (chỉ Admin xem được), nên xem trước bằng file đang có trên
  // máy. Địa chỉ tạm này tốn bộ nhớ tới khi thu hồi.
  const localPreviewUrls = useRef(new Set<string>())

  useEffect(() => {
    const urls = localPreviewUrls.current
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const isFull = value.length >= maxFiles
  const isLocked = disabled || isUploading
  const maxMegabytes = getMaxUploadBytes(purpose) / (1024 * 1024)

  async function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    // Xóa lựa chọn để chọn lại đúng file vừa bị chặn vẫn kích hoạt được sự kiện.
    event.target.value = ''
    if (files.length === 0) {
      return
    }

    upload.reset()
    const problems: string[] = []
    const accepted: File[] = []
    const freeSlots = maxFiles - value.length
    let skippedForSpace = 0

    for (const file of files) {
      const problem = validateImageFile(file, purpose)
      if (problem) {
        problems.push(problem)
      } else if (accepted.length >= freeSlots) {
        skippedForSpace += 1
      } else {
        accepted.push(file)
      }
    }
    if (skippedForSpace > 0) {
      problems.push(`Chỉ thêm được tối đa ${maxFiles} ảnh, ${skippedForSpace} ảnh chưa được tải lên.`)
    }
    setRejections(problems)

    // Tải lần lượt để ảnh vào danh sách đúng thứ tự đã chọn và không vượt hạn mức tải lên.
    setIsUploading(true)
    let images = value
    try {
      for (const file of accepted) {
        const uploaded = await upload.mutateAsync({ file, purpose })
        let previewUrl = uploaded.url
        if (previewUrl === null) {
          previewUrl = URL.createObjectURL(file)
          localPreviewUrls.current.add(previewUrl)
        }
        images = [...images, { path: uploaded.path, url: previewUrl }]
        onChange(images)
      }
    } catch {
      // Lỗi đã nằm trong `upload.error` và hiện ở ApiErrorAlert; ảnh đã tải xong trước đó vẫn giữ.
    } finally {
      setIsUploading(false)
    }
  }

  function removeImage(index: number) {
    const removedUrl = value[index].url
    if (removedUrl !== null && localPreviewUrls.current.delete(removedUrl)) {
      URL.revokeObjectURL(removedUrl)
    }
    onChange(value.filter((_, i) => i !== index))
  }

  function moveImage(index: number, offset: -1 | 1) {
    const images = [...value]
    const [moved] = images.splice(index, 1)
    images.splice(index + offset, 0, moved)
    onChange(images)
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={maxFiles > 1}
        className="hidden"
        onChange={handleFilesSelected}
      />

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {value.map((image, index) => {
          const name = `${imageLabel}, ảnh ${index + 1}`
          return (
            <li key={image.path} className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
              {image.url ? (
                <img src={image.url} alt={name} loading="lazy" className="size-full object-cover" />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
                  <ImageIcon className="size-5" aria-hidden="true" />
                  <span>Ảnh {index + 1}</span>
                </div>
              )}

              {reorderable && index === 0 && (
                <Badge className="absolute top-2 left-2" variant="secondary">
                  Ảnh đại diện
                </Badge>
              )}

              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                className="absolute top-1 right-1 shadow-sm"
                aria-label={`Xóa ${name}`}
                disabled={isLocked}
                onClick={() => removeImage(index)}
              >
                <X className="size-4" />
              </Button>

              {reorderable && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    className="absolute bottom-1 left-1 shadow-sm"
                    aria-label={`Chuyển ${name} lên trước`}
                    disabled={isLocked || index === 0}
                    onClick={() => moveImage(index, -1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    className="absolute right-1 bottom-1 shadow-sm"
                    aria-label={`Chuyển ${name} ra sau`}
                    disabled={isLocked || index === value.length - 1}
                    onClick={() => moveImage(index, 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </>
              )}
            </li>
          )
        })}

        {!isFull && (
          <li>
            <button
              type="button"
              disabled={isLocked}
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input text-sm text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
            >
              {isUploading ? <Spinner className="size-5" /> : <ImagePlus className="size-5" aria-hidden="true" />}
              <span>{isUploading ? 'Đang tải lên' : 'Thêm ảnh'}</span>
            </button>
          </li>
        )}
      </ul>

      <p className="text-sm text-muted-foreground">
        {maxFiles > 1 && `${value.length}/${maxFiles} ảnh. `}
        Tối đa {maxMegabytes} MB mỗi ảnh, định dạng JPEG, PNG hoặc WebP.
      </p>

      {rejections.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 text-sm text-destructive">
          {rejections.map((message, index) => (
            <li key={`${index}-${message}`}>{message}</li>
          ))}
        </ul>
      )}
      <ApiErrorAlert error={upload.error} />
    </div>
  )
}
