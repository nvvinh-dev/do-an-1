import type { School } from '@/types/schoolTypes'
import { normalizeSearchText } from '@/utils/normalizeSearchText'

// Tên trong danh mục ghi "TP.HCM", "Hà Nội"; người dùng hay gõ "hcm", "ho chi minh", "sai gon" hoặc "hn".
const CITY_SYNONYMS: [string, string][] = [
  ['tp.hcm', ' tp hcm hcm ho chi minh sai gon'],
  ['ha noi', ' hn'],
]

interface SchoolSearchKey {
  school: School
  name: string
  /** Tên, nơi đặt trụ sở, tên viết tắt và tên gọi khác của thành phố, để khớp từng từ gõ. */
  all: string
  /** Tên viết tắt, bỏ cả dấu cách: gõ "vnuhcm uit" hay "uit" đều khớp. */
  aliases: string[]
}

// Danh mục chỉ tải một lần mỗi lần mở trang: tính khóa tìm một lần cho mỗi trường.
const keyCache = new WeakMap<School, SchoolSearchKey>()

function toKeys(school: School): SchoolSearchKey {
  let keys = keyCache.get(school)
  if (!keys) {
    keys = buildKeys(school)
    keyCache.set(school, keys)
  }
  return keys
}

function buildKeys(school: School): SchoolSearchKey {
  const name = normalizeSearchText(school.name)
  let all = `${name} ${normalizeSearchText(school.city ?? '')} ${school.aliases.map(normalizeSearchText).join(' ')}`
  for (const [needle, extra] of CITY_SYNONYMS) {
    if (all.includes(needle)) all += extra
  }
  return { school, name, all, aliases: school.aliases.map((alias) => normalizeSearchText(alias).replace(/[\s-]/g, '')) }
}

/** Mức khớp, số nhỏ đứng trước. */
const ALIAS = 0
const IN_NAME = 1
const ALL_WORDS = 2

/**
 * Trường khớp chữ đang gõ ở ô chọn trường của T7, mục khớp nhất đứng đầu: ô chọn tô sẵn mục đầu tiên
 * nên nhấn Enter là chọn mục này. Chữ gõ bỏ dấu, không phân biệt hoa thường. Thứ tự: tên viết tắt
 * trùng hoặc bắt đầu bằng chữ gõ ("uit") → tên chứa nguyên chữ gõ ("cong nghe thong tin") → tên, nơi
 * đặt trụ sở và tên viết tắt chứa đủ từng từ gõ, không cần liền nhau ("bach khoa hcm"); cùng mức thì
 * chỗ khớp càng sớm càng trước, rồi tên ngắn hơn trước (tên ngắn thường là trường được gõ đúng), rồi
 * theo thứ tự danh mục. Chữ gõ rỗng thì trả đủ danh sách.
 */
export function searchSchools(schools: readonly School[], query: string): readonly School[] {
  const key = normalizeSearchText(query)
  if (key === '') {
    return schools
  }

  const compactKey = key.replace(/[\s-]/g, '')
  const words = key.split(' ')
  const matches: { school: School; level: number; position: number; length: number; order: number }[] = []

  schools.forEach((school, order) => {
    const keys = toKeys(school)
    const length = keys.name.length
    if (keys.aliases.some((alias) => alias.startsWith(compactKey) || alias.endsWith(compactKey))) {
      matches.push({ school, level: ALIAS, position: 0, length, order })
      return
    }

    const position = keys.name.indexOf(key)
    if (position >= 0) {
      matches.push({ school, level: IN_NAME, position, length, order })
      return
    }

    if (words.every((word) => keys.all.includes(word))) {
      matches.push({ school, level: ALL_WORDS, position: keys.all.indexOf(words[0]), length, order })
    }
  })

  return matches
    .sort((a, b) => a.level - b.level || a.position - b.position || a.length - b.length || a.order - b.order)
    .map((match) => match.school)
}
