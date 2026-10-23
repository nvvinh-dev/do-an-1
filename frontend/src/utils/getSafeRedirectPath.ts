/**
 * Đường dẫn `redirect` trên query của /login (docs/frontend-screens.md mục 1) chỉ được dùng khi
 * là đường dẫn trong chính ứng dụng. Giá trị như `//evil.com` hay `https://evil.com` sẽ đưa
 * người vừa đăng nhập sang trang ngoài nên bị bỏ; trả `null` để dùng trang chủ của vai trò.
 */
export function getSafeRedirectPath(redirect: string | null): string | null {
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//') || redirect.startsWith('/\\')) {
    return null
  }
  // Quay lại chính màn đăng nhập sẽ làm người dùng đứng yên tại đó.
  if (redirect === '/login' || redirect.startsWith('/login?')) {
    return null
  }
  return redirect
}
