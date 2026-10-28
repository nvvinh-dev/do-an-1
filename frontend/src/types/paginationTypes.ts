/** Khung phân trang dùng chung cho mọi danh sách có `page`, `pageSize` (docs/api-design.md mục 1). */
export interface PagedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}
