import { api } from '@/lib/api'
import type { UploadFileResponse, UploadPurpose } from '@/types/fileTypes'

/**
 * Tải một file lên `POST /files` (docs/api-design.md mục 14). Instance `api` mặc định gửi
 * `application/json`, mà axios thấy header đó sẽ đổi `FormData` thành JSON làm mất file; ghi đè
 * thành `multipart/form-data` để trình duyệt tự thêm boundary.
 */
export async function uploadFile(file: File, purpose: UploadPurpose): Promise<UploadFileResponse> {
  const body = new FormData()
  body.append('file', file)
  body.append('purpose', purpose)

  const response = await api.post<UploadFileResponse>('/files', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}
