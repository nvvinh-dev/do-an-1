/** Phạm vi của tiện ích: khu trọ hay phòng. */
export type AmenityScope = 'KhuTro' | 'Phong'

/** Một tiện ích trong `GET /amenities` (docs/api-design.md mục 6). */
export interface Amenity {
  id: number
  name: string
  scope: AmenityScope
}
