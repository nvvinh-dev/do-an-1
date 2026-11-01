import { getApiErrorInfo } from '@/lib/apiError'

/**
 * Câu `400` của `POST /auth/reset-password` khi email không tồn tại, hoặc token sai, hết hạn hay
 * đã dùng (api-design mục 2). Phải trùng từng chữ với câu trong `AuthService.ResetPasswordAsync`;
 * `isInvalidResetLinkError.test.ts` đọc file backend để giữ hai bên khớp nhau.
 */
export const INVALID_RESET_LINK_DETAIL = 'Yêu cầu đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'

/**
 * Lỗi đặt lại mật khẩu là do đường dẫn hỏng — chỉ khi đó màn A4 mới gợi ý xin đường dẫn mới ở A3.
 * Lỗi "mật khẩu mới chưa đúng quy tắc" thì token chưa bị dùng, sửa mật khẩu rồi gửi lại được.
 */
export function isInvalidResetLinkError(error: unknown): boolean {
  const { status, message } = getApiErrorInfo(error, { trust400Detail: true })
  return status === 400 && message === INVALID_RESET_LINK_DETAIL
}
