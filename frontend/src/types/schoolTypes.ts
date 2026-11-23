export const SCHOOL_TYPES = ['DaiHoc', 'CaoDang'] as const
export type SchoolType = (typeof SCHOOL_TYPES)[number]

/** Một trường trong `GET /schools` (docs/api-design.md mục 15, FR-112). */
export interface School {
  /** Mã trường của hệ thống, cố định. */
  code: string
  /** Tên đầy đủ; trường thành viên kèm đại học chủ quản. */
  name: string
  type: SchoolType
  /** Nơi đặt trụ sở, có thể không có. */
  city: string | null
  /** Tên viết tắt để tìm, ví dụ `UIT`. */
  aliases: string[]
}
