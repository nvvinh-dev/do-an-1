/**
 * Chữ cái đầu của tên gọi cho ô avatar ở S1. Người Việt gọi theo tên cuối nên lấy chữ đầu của từ cuối
 * ("Trần Văn Hùng" thành "H"), viết hoa theo tiếng Việt. Từ cuối không bắt đầu bằng chữ cái (số, ký hiệu
 * như "Dev 1") thì lùi về từ trước nó. Không có chữ cái nào thì trả "?".
 */
export function getNameInitial(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  for (let index = words.length - 1; index >= 0; index -= 1) {
    const first = Array.from(words[index])[0]
    if (first && /\p{L}/u.test(first)) {
      return first.toLocaleUpperCase('vi-VN')
    }
  }
  return '?'
}
