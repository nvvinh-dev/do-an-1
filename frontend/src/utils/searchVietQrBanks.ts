import { normalizeSearchText } from '@/utils/normalizeSearchText'
import { VIETQR_BANKS, type VietQrBank } from '@/utils/vietQrBanks'

/** Bỏ dấu, chữ thường, bỏ cả dấu cách: gõ "vietin bank" vẫn khớp "VietinBank". */
function toSearchKey(text: string): string {
  return normalizeSearchText(text).replace(/ /g, '')
}

const SEARCH_KEYS = VIETQR_BANKS.map((bank) => ({
  bank,
  shortName: toSearchKey(bank.shortName),
  name: toSearchKey(bank.name),
}))

/** Mức khớp, số nhỏ đứng trước. */
const STARTS_SHORT_NAME = 0
const IN_SHORT_NAME = 1
const IN_FULL_NAME = 2

/**
 * Ngân hàng khớp chữ đang gõ ở ô chọn ngân hàng của L4, mục khớp nhất đứng đầu: ô chọn tô sẵn mục
 * đầu tiên nên nhấn Enter là chọn mục này. Thứ tự: tên ngắn bắt đầu bằng chữ gõ → tên ngắn chứa chữ
 * gõ → chỉ tên đầy đủ chứa chữ gõ; cùng mức thì chỗ khớp càng sớm càng trước, rồi theo thứ tự của
 * `VIETQR_BANKS`. Cần xếp vì nhiều ngân hàng số mang tên ngân hàng mẹ trong tên đầy đủ: gõ "vpbank"
 * thì VPBank phải đứng trước CAKE và Ubank ("... CAKE by VPBank"), không thì Enter chọn nhầm ngân hàng.
 * Chữ gõ rỗng thì trả đủ danh sách.
 */
export function searchVietQrBanks(query: string): readonly VietQrBank[] {
  const key = toSearchKey(query)
  if (key === '') {
    return VIETQR_BANKS
  }

  const matches: { bank: VietQrBank; level: number; position: number; order: number }[] = []
  SEARCH_KEYS.forEach(({ bank, shortName, name }, order) => {
    const shortNamePosition = shortName.indexOf(key)
    if (shortNamePosition >= 0) {
      const level = shortNamePosition === 0 ? STARTS_SHORT_NAME : IN_SHORT_NAME
      matches.push({ bank, level, position: shortNamePosition, order })
      return
    }

    const namePosition = name.indexOf(key)
    if (namePosition >= 0) {
      matches.push({ bank, level: IN_FULL_NAME, position: namePosition, order })
    }
  })

  return matches
    .sort((a, b) => a.level - b.level || a.position - b.position || a.order - b.order)
    .map((match) => match.bank)
}
