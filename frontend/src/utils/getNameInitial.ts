/**
 * Chữ cái đầu của tên gọi cho ô avatar ở S1. Người Việt gọi theo tên cuối nên lấy chữ đầu của từ cuối
 * ("Trần Văn Hùng" thành "H"), viết hoa theo tiếng Việt. Không có chữ nào thì trả "?".
 */
export function getNameInitial(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  const lastWord = words.at(-1)
  const first = lastWord ? Array.from(lastWord)[0] : undefined
  return first ? first.toLocaleUpperCase('vi-VN') : '?'
}
