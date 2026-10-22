import type { UploadPurpose } from '@/types/fileTypes'

const MB = 1024 * 1024

// Ảnh khu trọ và phòng vào bucket công khai (5 MB); các loại còn lại vào bucket riêng tư (10 MB).
// Giới hạn khớp docs/api-design.md mục 14 và FilesController.
const PUBLIC_PURPOSES: readonly UploadPurpose[] = ['AnhKhuTro', 'AnhPhong']
const PUBLIC_MAX_BYTES = 5 * MB
const PRIVATE_MAX_BYTES = 10 * MB

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function getMaxUploadBytes(purpose: UploadPurpose): number {
  return PUBLIC_PURPOSES.includes(purpose) ? PUBLIC_MAX_BYTES : PRIVATE_MAX_BYTES
}

/**
 * Kiểm tra ảnh trước khi gửi để người dùng không phải chờ tải lên rồi mới biết bị từ chối. Chỉ để
 * trải nghiệm: server vẫn kiểm tra lại dung lượng và đọc định dạng từ nội dung file. Trả câu báo
 * lỗi, hoặc `null` khi ảnh hợp lệ.
 */
export function validateImageFile(
  file: Pick<File, 'name' | 'size' | 'type'>,
  purpose: UploadPurpose,
): string | null {
  // `type` rỗng nghĩa là trình duyệt không nhận ra loại file; để server đọc nội dung quyết định.
  if (file.type !== '' && !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `"${file.name}" không phải ảnh JPEG, PNG hoặc WebP.`
  }

  const maxBytes = getMaxUploadBytes(purpose)
  if (file.size > maxBytes) {
    return `"${file.name}" lớn hơn ${maxBytes / MB} MB. Vui lòng chọn ảnh nhẹ hơn.`
  }

  return null
}
