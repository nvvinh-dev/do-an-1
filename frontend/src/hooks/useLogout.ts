import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { setAccessToken } from '@/lib/api'

/**
 * Đăng xuất không gọi API vì API không có endpoint đăng xuất: xóa token, xóa toàn bộ dữ liệu
 * TanStack Query đang lưu, rồi về /login (docs/frontend-screens.md mục 1).
 */
export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return () => {
    setAccessToken(null)
    queryClient.clear()
    navigate('/login', { replace: true })
  }
}
