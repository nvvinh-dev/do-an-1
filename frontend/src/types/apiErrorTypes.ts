/** Thân lỗi `application/problem+json` mà backend trả về (docs/api-design.md mục 1). */
export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
}

/** Lỗi đã đọc xong, đủ để `ApiErrorAlert` hiển thị theo docs/frontend-screens.md mục 1. */
export interface ApiErrorInfo {
  /** Mã HTTP; `null` khi không nhận được phản hồi (mất mạng, máy chủ không chạy). */
  status: number | null
  message: string
  /** Số giây phải chờ theo header `Retry-After` của `429`; `null` khi không có. */
  retryAfterSeconds: number | null
  /** Lỗi mạng và lỗi 5xx: gửi lại có thể thành công, nên hiện nút thử lại. */
  canRetry: boolean
}
