import type { RoomListItem } from '@/types/roomTypes'

type RoomListingState = Pick<RoomListItem, 'occupancyStatus' | 'visibilityStatus' | 'isListed'>

/**
 * Câu giải thích vì sao phòng có hoặc không có trong kết quả tìm kiếm. Phòng chỉ xuất hiện khi đủ
 * bốn điều kiện BR-05 (`isListed`, API mục 5.2): Trống, đang hiển thị, khu trọ đang khai thác và
 * Chủ trọ không bị khóa — nên đã bật hiển thị mà phòng không Trống thì vẫn không ai thấy (FR-17).
 */
export function getRoomListingNote({ occupancyStatus, visibilityStatus, isListed }: RoomListingState): string {
  if (isListed) {
    return 'Phòng đang xuất hiện trong kết quả tìm kiếm.'
  }
  if (occupancyStatus === 'LuuTru') {
    return 'Phòng đã lưu trữ nên không xuất hiện trong tìm kiếm.'
  }
  if (visibilityStatus === 'DaAnBoiAdmin') {
    return 'Tin bị Admin ẩn nên phòng không xuất hiện trong tìm kiếm. Chủ trọ không tự bật lại được.'
  }
  if (visibilityStatus === 'DaAnBoiChuTro') {
    return 'Tin đang ẩn nên phòng không xuất hiện trong tìm kiếm.'
  }

  switch (occupancyStatus) {
    case 'DangGiuCho':
      return 'Tin đang bật nhưng phòng đang giữ chỗ cho người thuê nên tạm rời khỏi tìm kiếm. Phòng hiện lại khi về Trống.'
    case 'DangThue':
      return 'Tin đang bật nhưng phòng đang có người thuê nên tạm rời khỏi tìm kiếm. Phòng hiện lại khi về Trống.'
    case 'BaoTri':
      return 'Tin đang bật nhưng phòng đang bảo trì nên tạm rời khỏi tìm kiếm. Phòng hiện lại khi về Trống.'
    // Khu trọ lưu trữ thì mọi phòng của khu cũng sang Lưu trữ (API mục 5.1), đã rơi vào nhánh trên;
    // phòng Trống, đang hiển thị mà vẫn không có trong tìm kiếm chỉ còn do tài khoản bị khóa.
    case 'Trong':
      return 'Tin đang bật nhưng phòng chưa xuất hiện trong tìm kiếm vì tài khoản đang bị khóa.'
  }
}
