// Gốc giả chỉ để phân tích đường dẫn tương đối; cố định để test chạy được trong Node.
const BASE = 'http://smartrent.invalid'

/**
 * Đường dẫn `redirect` trên query của /login (docs/frontend-screens.md mục 1) chỉ được dùng khi
 * là đường dẫn trong chính ứng dụng. Phân tích bằng `URL` rồi so origin thay vì so tiền tố chuỗi,
 * vì trình duyệt bỏ tab và xuống dòng khi phân tích: `/\t/evil.com` thực chất là `//evil.com`.
 * Trả `null` để dùng trang chủ của vai trò.
 */
export function getSafeRedirectPath(redirect: string | null): string | null {
  if (!redirect || !redirect.startsWith('/')) {
    return null
  }
  let url: URL
  try {
    url = new URL(redirect, BASE)
  } catch {
    return null // ví dụ "//[" ném lỗi Invalid URL
  }
  // Quay lại chính màn đăng nhập sẽ làm người dùng đứng yên tại đó.
  if (url.origin !== BASE || url.pathname === '/login') {
    return null
  }
  return url.pathname + url.search + url.hash
}
