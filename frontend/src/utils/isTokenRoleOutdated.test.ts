import { describe, expect, it } from 'vitest'
import { isTokenRoleOutdated } from './isTokenRoleOutdated'

const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'

/** Dựng token cùng dạng backend phát hành: JWT ba đoạn, phần thân mã hóa base64url. */
function createToken(payload: Record<string, unknown>) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.chu-ky`
}

describe('isTokenRoleOutdated', () => {
  it('coi token là cũ khi tài khoản đã đổi vai trò sau lúc đăng nhập', () => {
    const token = createToken({ sub: '47', [ROLE_CLAIM]: 'Tenant' })

    expect(isTokenRoleOutdated(token, ['Landlord'])).toBe(true)
  })

  it('không coi là cũ khi vai trò trong token trùng vai trò hiện tại', () => {
    const token = createToken({ sub: '47', [ROLE_CLAIM]: 'Landlord' })

    expect(isTokenRoleOutdated(token, ['Landlord'])).toBe(false)
  })

  it('đọc được claim vai trò dạng mảng', () => {
    const token = createToken({ sub: '47', [ROLE_CLAIM]: ['Tenant'] })

    expect(isTokenRoleOutdated(token, ['Tenant'])).toBe(false)
    expect(isTokenRoleOutdated(token, ['Landlord'])).toBe(true)
  })

  it('giải mã được phần thân có ký tự URL-safe của base64url', () => {
    // Họ tên này mã hóa ra chuỗi có `-` hoặc `_`, là hai ký tự `atob` không nhận nếu chưa đổi.
    const token = createToken({ sub: '47', name: '~~~???>>>', [ROLE_CLAIM]: 'Tenant' })

    expect(token.split('.')[1]).toMatch(/[-_]/)
    expect(isTokenRoleOutdated(token, ['Landlord'])).toBe(true)
  })

  it('không kết luận token cũ khi không đọc được vai trò, để backend quyết định', () => {
    expect(isTokenRoleOutdated('khong-phai-jwt', ['Landlord'])).toBe(false)
    expect(isTokenRoleOutdated('a.@@@.c', ['Landlord'])).toBe(false)
    expect(isTokenRoleOutdated(createToken({ sub: '47' }), ['Landlord'])).toBe(false)
  })
})
