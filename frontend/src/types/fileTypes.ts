/** Mục đích tải file, quyết định bucket và quyền (docs/api-design.md mục 14). */
export type UploadPurpose =
  | 'GiayToNhanThan'
  | 'AnhKhuTro'
  | 'AnhPhong'
  | 'AnhDongHo'
  | 'MinhChungThanhToan'
  | 'AnhHuHong'

/** Response của `POST /files`. `url` chỉ để xem trước; `GiayToNhanThan` không có URL nên là `null`. */
export interface UploadFileResponse {
  path: string
  url: string | null
  purpose: UploadPurpose
}

/**
 * Một ảnh đã tải lên. `path` là giá trị gửi lại trong request nghiệp vụ (các trường `...Path`);
 * `url` chỉ để xem trước. Cùng dạng `{ path, url }` với `images` mà API chi tiết khu trọ và phòng
 * trả về, nên truyền thẳng được vào `ImageUploader`.
 */
export interface UploadedImage {
  path: string
  url: string | null
}
