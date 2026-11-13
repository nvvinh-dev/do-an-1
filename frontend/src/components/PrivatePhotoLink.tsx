import { ImageIcon } from 'lucide-react'

interface PrivatePhotoLinkProps {
  /** URL có chữ ký của ảnh riêng tư (docs/api-design.md mục 14); `null` thì không hiện gì. */
  url: string | null
  label: string
}

/** Ảnh riêng tư là URL có chữ ký hết hạn sau 1 giờ; mở ở tab mới, quá hạn thì tải lại trang. */
export default function PrivatePhotoLink({ url, label }: PrivatePhotoLinkProps) {
  if (url === null) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 self-start underline underline-offset-4"
    >
      <ImageIcon className="size-4" aria-hidden="true" />
      {label}
    </a>
  )
}
