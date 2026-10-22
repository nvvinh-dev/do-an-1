import axios from 'axios'
import { currentUserQueryKey, queryClient } from '@/lib/queryClient'

/**
 * Instance dùng chung cho mọi lời gọi API.
 * Đường dẫn gốc theo docs/api-design.md mục 1.
 */
export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

const TOKEN_KEY = 'smartrent.accessToken'

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAccessToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Access token sống 60 phút và hệ thống không dùng refresh token, nên gặp 401 là phiên
// đã hết: xóa token và đặt tài khoản đang đăng nhập về null. ProtectedRoute thấy chưa
// đăng nhập sẽ chuyển tới /login?redirect=<trang đang mở>. Riêng 401 của POST /auth/login
// là sai email hoặc mật khẩu, màn đăng nhập tự hiện (docs/frontend-screens.md mục 1).
// Dữ liệu còn trong cache là của phiên cũ nên hủy và xóa luôn, nếu không người đăng nhập
// kế tiếp trên cùng trang sẽ thấy dữ liệu của tài khoản trước (ví dụ số thông báo chưa
// đọc) khi API chưa kịp trả. Chỉ giữ query tài khoản để đặt về null: xóa nó thì các
// component đang dùng useCurrentUser không được báo nên không chuyển trang.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && error.config?.url !== '/auth/login') {
      setAccessToken(null)
      const isSessionData = (query: { queryKey: readonly unknown[] }) =>
        query.queryKey.join() !== currentUserQueryKey.join()
      void queryClient.cancelQueries({ predicate: isSessionData })
      queryClient.removeQueries({ predicate: isSessionData })
      queryClient.setQueryData(currentUserQueryKey, null)
    }
    return Promise.reject(error)
  },
)
