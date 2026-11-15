import { isAxiosError } from 'axios'
import type { ApiErrorInfo, ProblemDetails } from '@/types/apiErrorTypes'

// Câu dùng khi server không gửi `detail`. 400 không dùng `detail` hay `errors` của server vì
// lỗi kiểm tra dữ liệu của ASP.NET Core và FluentValidation viết bằng tiếng Anh; form đã tự
// kiểm tra trước khi gửi nên tới được đây là hiếm.
const FALLBACK_MESSAGES: Record<number, string> = {
  400: 'Dữ liệu gửi lên chưa hợp lệ. Vui lòng kiểm tra lại các ô đã nhập.',
  401: 'Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu, hoặc bạn không xem được nội dung này.',
  429: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
}

const NETWORK_MESSAGE = 'Không kết nối được máy chủ. Kiểm tra kết nối mạng rồi thử lại.'
const SERVER_MESSAGE = 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau ít phút.'
const OTHER_MESSAGE = 'Không thực hiện được thao tác. Vui lòng thử lại.'

/**
 * Đọc lỗi của một lời gọi API thành câu hiển thị cho người dùng, theo bảng "Hiển thị lỗi từ API"
 * ở docs/frontend-screens.md mục 1. Có `detail` thì dùng `detail`: 409, 422, 429 và 401/403 của
 * màn đăng nhập đều mang câu tiếng Việt do server viết.
 *
 * `trust400Detail`: một số endpoint (`POST /auth/reset-password`) trả `400` với `detail` là câu
 * tiếng Việt cố định do service viết (`AuthService.ResetPasswordAsync`), không phải lỗi kiểm tra
 * dữ liệu của Identity hay FluentValidation — các lỗi đó luôn viết bằng tiếng Anh nên mặc định
 * vẫn bỏ qua `detail` ở `400`. Chỉ bật khi biết chắc endpoint đang gọi thuộc trường hợp này.
 */
export function getApiErrorInfo(error: unknown, options?: { trust400Detail?: boolean }): ApiErrorInfo {
  if (!isAxiosError(error) || !error.response) {
    return { status: null, message: NETWORK_MESSAGE, retryAfterSeconds: null, canRetry: true }
  }

  const { status, data, headers } = error.response
  if (status >= 500) {
    return { status, message: SERVER_MESSAGE, retryAfterSeconds: null, canRetry: true }
  }

  const detail = (data as ProblemDetails | undefined)?.detail?.trim()
  const trust400 = status !== 400 || options?.trust400Detail === true
  const message = (trust400 && detail) || FALLBACK_MESSAGES[status] || OTHER_MESSAGE
  const retryAfterSeconds = status === 429 ? parseRetryAfter(headers['retry-after']) : null

  return { status, message, retryAfterSeconds, canRetry: false }
}

/** Trang chi tiết gặp lỗi này thì hiện `NotFoundPage` thay cho `ApiErrorAlert`. */
export function isNotFoundError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404
}

// `Retry-After` có thể là số giây hoặc một mốc thời gian HTTP; backend hiện chỉ gửi số giây.
function parseRetryAfter(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }

  const seconds = Number(value)
  if (Number.isFinite(seconds)) {
    return Math.max(0, Math.ceil(seconds))
  }

  const date = Date.parse(value)
  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - Date.now()) / 1000))
}
