import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import authServiceSource from '../../../backend/src/SmartRent.Api/Services/AuthService.cs?raw'
import { INVALID_RESET_LINK_DETAIL, isInvalidResetLinkError } from '@/utils/isInvalidResetLinkError'

/** Lỗi Axios có response với mã và body ProblemDetails cho trước. */
function apiError(status: number, detail?: string): AxiosError {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    data: detail === undefined ? { status } : { status, detail },
    headers: {},
    config,
  })
}

describe('INVALID_RESET_LINK_DETAIL', () => {
  it('trùng câu trong AuthService.ResetPasswordAsync ở backend', () => {
    expect(authServiceSource).toContain(`"${INVALID_RESET_LINK_DETAIL}"`)
  })
})

describe('isInvalidResetLinkError', () => {
  it('400 với câu đường dẫn hỏng thì đúng', () => {
    expect(isInvalidResetLinkError(apiError(400, INVALID_RESET_LINK_DETAIL))).toBe(true)
  })

  it('400 với câu quy tắc mật khẩu thì sai', () => {
    const detail = 'Mật khẩu mới chưa đúng quy tắc: Mật khẩu phải có ít nhất một chữ hoa.'
    expect(isInvalidResetLinkError(apiError(400, detail))).toBe(false)
  })

  it('400 không có detail thì sai', () => {
    expect(isInvalidResetLinkError(apiError(400))).toBe(false)
  })

  it('429 thì sai', () => {
    expect(isInvalidResetLinkError(apiError(429, 'Quá nhiều yêu cầu.'))).toBe(false)
  })
})
