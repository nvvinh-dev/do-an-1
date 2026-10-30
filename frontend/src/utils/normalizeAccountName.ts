/**
 * Đưa tên chủ tài khoản về dạng ngân hàng in trên thẻ và server nhận (docs/api-design.md mục 2.1):
 * bỏ dấu tiếng Việt, đổi `đ` thành `D`, viết hoa, gộp khoảng trắng. Gõ "Nguyễn Văn A" thành
 * "NGUYEN VAN A". Ký tự không phải chữ (dấu chấm, chữ số) giữ nguyên để ô nhập báo lỗi cho người
 * dùng tự sửa, không âm thầm xóa bớt tên.
 */
export function normalizeAccountName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'D')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}
