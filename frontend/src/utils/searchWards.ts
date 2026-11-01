import { normalizeSearchText } from '@/utils/normalizeSearchText'

// Tên trong danh mục bắt đầu bằng loại đơn vị; người dùng thường chỉ gõ phần tên riêng.
const WARD_TYPE_PREFIXES = ['phuong ', 'xa ', 'dac khu ']

/** Mức khớp, số nhỏ đứng trước. */
const EXACT = 0
const STARTS_NAME = 1
const STARTS_WORD = 2
const INSIDE = 3

/**
 * Phường/xã khớp chữ đang gõ ở ô chọn phường/xã của L2, mục khớp nhất đứng đầu: ô chọn tô sẵn mục
 * đầu tiên nên nhấn Enter là chọn mục này. Vẫn lấy đúng các phường/xã có tên (bỏ dấu) chứa chữ gõ,
 * chỉ xếp lại: trùng hẳn tên → tên bắt đầu bằng chữ gõ (tính cả khi bỏ "Phường", "Xã", "Đặc khu") →
 * một từ trong tên bắt đầu bằng chữ gõ → chứa ở giữa từ; cùng mức thì chỗ khớp càng sớm càng trước,
 * rồi theo thứ tự danh mục. Cần xếp vì nhiều tên này là đầu của tên khác: gõ "tan son" thì
 * "Phường Tân Sơn" phải đứng trước "Phường Tân Sơn Nhất", không thì Enter chọn nhầm phường.
 * Chữ gõ rỗng thì trả đủ danh sách.
 */
export function searchWards(wards: readonly string[], query: string): readonly string[] {
  const key = normalizeSearchText(query)
  if (key === '') {
    return wards
  }

  const matches: { ward: string; level: number; position: number; order: number }[] = []
  wards.forEach((ward, order) => {
    const name = normalizeSearchText(ward)
    const position = name.indexOf(key)
    if (position < 0) {
      return
    }

    const prefix = WARD_TYPE_PREFIXES.find((typePrefix) => name.startsWith(typePrefix))
    const properName = prefix ? name.slice(prefix.length) : name
    if (name === key || properName === key) {
      matches.push({ ward, level: EXACT, position: 0, order })
    } else if (name.startsWith(key) || properName.startsWith(key)) {
      matches.push({ ward, level: STARTS_NAME, position: 0, order })
    } else {
      const wordStart = name.indexOf(` ${key}`)
      matches.push(
        wordStart >= 0
          ? { ward, level: STARTS_WORD, position: wordStart + 1, order }
          : { ward, level: INSIDE, position, order },
      )
    }
  })

  return matches
    .sort((a, b) => a.level - b.level || a.position - b.position || a.order - b.order)
    .map((match) => match.ward)
}
