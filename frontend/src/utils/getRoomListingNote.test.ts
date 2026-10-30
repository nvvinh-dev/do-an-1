import { describe, expect, it } from 'vitest'
import { getRoomListingNote } from '@/utils/getRoomListingNote'

describe('getRoomListingNote', () => {
  it('đủ điều kiện BR-05: phòng có trong tìm kiếm', () => {
    expect(getRoomListingNote({ occupancyStatus: 'Trong', visibilityStatus: 'DangHienThi', isListed: true })).toBe(
      'Phòng đang xuất hiện trong kết quả tìm kiếm.',
    )
  })

  it('tin đang ẩn: nói rõ là do ẩn tin, kể cả khi phòng đang thuê', () => {
    expect(getRoomListingNote({ occupancyStatus: 'Trong', visibilityStatus: 'DaAnBoiChuTro', isListed: false })).toBe(
      'Tin đang ẩn nên phòng không xuất hiện trong tìm kiếm.',
    )
    expect(getRoomListingNote({ occupancyStatus: 'DangThue', visibilityStatus: 'DaAnBoiChuTro', isListed: false })).toBe(
      'Tin đang ẩn nên phòng không xuất hiện trong tìm kiếm.',
    )
  })

  it('đã bật hiển thị mà phòng không Trống: nêu trạng thái khai thác làm phòng rời khỏi tìm kiếm', () => {
    expect(getRoomListingNote({ occupancyStatus: 'DangGiuCho', visibilityStatus: 'DangHienThi', isListed: false })).toContain(
      'đang giữ chỗ',
    )
    expect(getRoomListingNote({ occupancyStatus: 'DangThue', visibilityStatus: 'DangHienThi', isListed: false })).toContain(
      'đang có người thuê',
    )
    expect(getRoomListingNote({ occupancyStatus: 'BaoTri', visibilityStatus: 'DangHienThi', isListed: false })).toContain(
      'đang bảo trì',
    )
  })

  it('Trống, đang hiển thị mà vẫn không có trong tìm kiếm: do khu trọ hoặc tài khoản', () => {
    expect(getRoomListingNote({ occupancyStatus: 'Trong', visibilityStatus: 'DangHienThi', isListed: false })).toContain(
      'khu trọ không còn khai thác hoặc tài khoản đang bị khóa',
    )
  })

  it('phòng lưu trữ và tin bị Admin ẩn được nêu trước trạng thái hiển thị', () => {
    expect(getRoomListingNote({ occupancyStatus: 'LuuTru', visibilityStatus: 'DangHienThi', isListed: false })).toBe(
      'Phòng đã lưu trữ nên không xuất hiện trong tìm kiếm.',
    )
    expect(getRoomListingNote({ occupancyStatus: 'Trong', visibilityStatus: 'DaAnBoiAdmin', isListed: false })).toContain(
      'Tin bị Admin ẩn',
    )
  })
})
