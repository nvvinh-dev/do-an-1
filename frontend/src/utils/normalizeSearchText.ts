/**
 * Đưa chữ về dạng để so khớp khi tìm trong danh sách (phường/xã, ngân hàng): bỏ dấu tiếng Việt,
 * đổi `đ` thành `d`, chữ thường, gộp khoảng trắng. Gõ "ba dinh" vẫn tìm thấy "Phường Ba Đình".
 * Chỉ dùng để so khớp trên máy; giá trị gửi lên server luôn là tên gốc trong danh mục.
 */
export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
