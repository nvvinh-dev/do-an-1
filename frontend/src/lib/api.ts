import axios from 'axios'

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

// Access token sống 60 phút và hệ thống không dùng refresh token, nên khi
// backend trả 401 thì xóa token và để tầng trên đưa người dùng về màn đăng nhập.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setAccessToken(null)
    }
    return Promise.reject(error)
  },
)
