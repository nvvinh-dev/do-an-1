/**
 * Tỷ lệ lấp đầy để hiển thị ở L1: phòng đang thuê trên tổng phòng (không tính phòng đã lưu trữ), làm
 * tròn tới số nguyên phần trăm (docs/frontend-screens.md mục 6, L1). Chưa có phòng nào thì `null`.
 */
export function getOccupancyPercent(rentedRooms: number, totalRooms: number): number | null {
  if (totalRooms <= 0) return null
  return Math.round((rentedRooms / totalRooms) * 100)
}
