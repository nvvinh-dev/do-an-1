/** Một tỉnh/thành và các phường/xã của nó trong `GET /locations` (docs/api-design.md mục 6). */
export interface Location {
  city: string
  wards: string[]
}
