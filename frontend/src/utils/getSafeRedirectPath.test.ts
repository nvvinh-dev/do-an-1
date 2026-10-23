import { describe, expect, it } from 'vitest'
import { getSafeRedirectPath } from '@/utils/getSafeRedirectPath'

describe('getSafeRedirectPath', () => {
  it('giữ đường dẫn trong ứng dụng, kể cả query', () => {
    expect(getSafeRedirectPath('/tenant/invoices/5')).toBe('/tenant/invoices/5')
    expect(getSafeRedirectPath('/landlord/contracts?status=DangHieuLuc')).toBe('/landlord/contracts?status=DangHieuLuc')
  })

  it('bỏ giá trị trống hoặc không có', () => {
    expect(getSafeRedirectPath(null)).toBeNull()
    expect(getSafeRedirectPath('')).toBeNull()
  })

  it('bỏ địa chỉ dẫn ra ngoài ứng dụng', () => {
    expect(getSafeRedirectPath('https://evil.example.com')).toBeNull()
    expect(getSafeRedirectPath('//evil.example.com')).toBeNull()
    expect(getSafeRedirectPath('/\\evil.example.com')).toBeNull()
    expect(getSafeRedirectPath('javascript:alert(1)')).toBeNull()
    expect(getSafeRedirectPath('tenant')).toBeNull()
  })

  it('bỏ đường dẫn có tab hoặc xuống dòng mà trình duyệt hiểu thành địa chỉ ngoài', () => {
    expect(getSafeRedirectPath('/\t/evil.example.com')).toBeNull()
    expect(getSafeRedirectPath('/\n/evil.example.com')).toBeNull()
    expect(getSafeRedirectPath('/\t\\evil.example.com')).toBeNull()
    expect(getSafeRedirectPath('//[')).toBeNull()
  })

  it('bỏ đường dẫn quay lại chính màn đăng nhập', () => {
    expect(getSafeRedirectPath('/login')).toBeNull()
    expect(getSafeRedirectPath('/login?redirect=%2Ftenant')).toBeNull()
    expect(getSafeRedirectPath('/login#x')).toBeNull()
  })
})
